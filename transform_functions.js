
function transformNwsData(data) {
    const dailyData = [];
    const hourlyData = [];

    const days = {};
    data.properties.periods.forEach(period => {
        const dateKey = new Date(period.startTime).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
        if (!days[dateKey]) days[dateKey] = [];
        days[dateKey].push(period);
    });

    // Process hourly data first to make it available for daily decisions
    const gridData = data.gridData.properties;
    const hourlyDays = {};
    if (gridData.temperature && gridData.temperature.values) {
        gridData.temperature.values.forEach((item, index) => {
            const time = new Date(item.validTime.split('/')[0]);
            const dateKey = time.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
            if (!hourlyDays[dateKey]) hourlyDays[dateKey] = [];
            hourlyDays[dateKey].push({
                time,
                temperature: Math.round(item.value * 9/5 + 32),
                wind: Math.round(gridData.windSpeed.values[index]?.value * 0.621371 ?? 0),
                precipitation: gridData.probabilityOfPrecipitation.values[index]?.value ?? 0,
                wave: null // Initialize wave height
            });
        });
    }

    if (gridData.waveHeight && gridData.waveHeight.values) {
        gridData.waveHeight.values.forEach(item => {
            const startDate = new Date(item.validTime.split('/')[0]);
            const durationMatch = item.validTime.match(/P(?:(\d+)D)?T(?:(\d+)H)?/);
            if (!durationMatch || item.value === null) return;
            const daysDuration = parseInt(durationMatch[1], 10) || 0;
            const hoursDuration = parseInt(durationMatch[2], 10) || 0;
            const totalHours = (daysDuration * 24) + hoursDuration;
            if (totalHours === 0) return;
            const endDate = new Date(startDate.getTime() + totalHours * 3600 * 1000);
            for (let d = new Date(startDate); d < endDate; d.setHours(d.getHours() + 1)) {
                const dateKey = d.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
                if (hourlyDays[dateKey]) {
                    const hour = d.getHours();
                    const targetHour = hourlyDays[dateKey].find(h => h.time.getHours() === hour);
                    if (targetHour) targetHour.wave = (item.value * 3.28084).toFixed(1);
                }
            }
        });
    }

    // Now process daily data, using the processed hourly data
    Object.values(days).slice(0, 8).forEach(dayPeriods => {
        const firstPeriod = dayPeriods[0];
        const date = new Date(firstPeriod.startTime);
        const dateKey = date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });

        dailyData.push({
            date,
            dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
            maxTemp: Math.max(...dayPeriods.map(p => p.temperature)),
            minTemp: Math.min(...dayPeriods.map(p => p.temperature)),
            icon: mapNwsIconToAppIcon(dayPeriods.find(p => p.isDaytime)?.icon || firstPeriod.icon),
            description: dayPeriods.find(p => p.isDaytime)?.shortForecast || firstPeriod.shortForecast,
            sunrise: data.sunriseSunset.sunrise,
            sunset: data.sunriseSunset.sunset,
            boatingDecision: isGoodBoatingDayNWS(dayPeriods, hourlyDays[dateKey])
        });
    });

    dailyData.forEach(day => {
        const dateKey = day.date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
        hourlyData.push(hourlyDays[dateKey] || []);
    });

    return { daily: dailyData, hourly: hourlyData, tideData: data.tideData };
}

function transformOpenMeteoData(data) {
    const dailyData = [];
    const hourlyData = [];

    data.daily.time.forEach((dateStr, i) => {
        const date = new Date(dateStr + 'T00:00');
        dailyData.push({
            date,
            dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
            maxTemp: Math.round(data.daily.temperature_2m_max[i]),
            minTemp: Math.round(data.daily.temperature_2m_min[i]),
            icon: getWeatherIcon(data.daily.weather_code[i]),
            description: getWeatherDescription(data.daily.weather_code[i]),
            sunrise: new Date(data.daily.sunrise[i]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            sunset: new Date(data.daily.sunset[i]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            boatingDecision: isGoodBoatingDay(data.hourly, i)
        });

        const startIndex = i * 24;
        const endIndex = startIndex + 24;
        const dayHourly = [];
        for (let j = startIndex; j < endIndex && j < data.hourly.time.length; j++) {
            let tide = null;
            if (data.marine?.hourly?.sea_level_height_msl) {
                const tideVal = data.marine.hourly.sea_level_height_msl[j];
                if (tideVal !== null && !isNaN(tideVal)) tide = tideVal.toFixed(2);
            }
            dayHourly.push({
                time: new Date(data.hourly.time[j]),
                temperature: Math.round(data.hourly.temperature_2m[j]),
                wind: Math.round(data.hourly.wind_speed_10m[j]),
                precipitation: data.hourly.precipitation_probability[j],
                wave: null,
                tide
            });
        }
        hourlyData.push(dayHourly);
    });

    let tideChartData = null;
    if (data.marine?.hourly?.time) {
        tideChartData = data.marine.hourly.time.map((t, i) => ({ t, v: data.marine.hourly.sea_level_height_msl[i] }));
    }

    return { daily: dailyData, hourly: hourlyData, tideData: tideChartData };
}

function mapNwsIconToAppIcon(iconUrl) {
    const mapping = { "skc": "sun", "few": "cloudy", "sct": "cloudy", "bkn": "cloudy", "ovc": "cloudy", "wind_skc": "sun", "wind_few": "cloudy", "wind_sct": "cloudy", "wind_bkn": "cloudy", "wind_ovc": "cloudy", "snow": "snow", "rain_snow": "rain", "rain_sleet": "rain", "snow_sleet": "snow", "fzra": "rain", "rain_fzra": "rain", "snow_fzra": "snow", "sleet": "rain", "rain": "rain", "rain_showers": "showers", "rain_showers_hi": "showers", "tsra": "thunderstorm", "tsra_sct": "thunderstorm", "tsra_hi": "thunderstorm", "tornado": "thunderstorm", "hurricane": "thunderstorm", "tropical_storm": "thunderstorm", "dust": "fog", "smoke": "fog", "haze": "fog", "hot": "sun", "cold": "sun", "blizzard": "snow", "fog": "fog" };
    const key = Object.keys(mapping).find(key => iconUrl.includes(key));
    return `icons/${mapping[key] || 'cloudy'}.svg`;
}
