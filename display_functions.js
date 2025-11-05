
function displayWeather(data, locationName, lat, lon) {
    document.getElementById('current-location').textContent = `Weather for: ${locationName}`;
    const forecastContainer = document.getElementById('weather-forecast');
    forecastContainer.innerHTML = '';

    if (lat && lon) displayRadarMap(lat, lon);

    data.daily.forEach((day, index) => {
        const dayDiv = document.createElement('div');
        dayDiv.classList.add('day-forecast');
        dayDiv.addEventListener('click', () => displayHourlyForecast(index, data));

        dayDiv.innerHTML = `
            <h2>${day.dayName}</h2>
            <img src="${day.icon}" alt="Weather icon">
            <p class="temp"><span class="max">${Math.round(day.maxTemp)}°F</span> / ${Math.round(day.minTemp)}°F</p>
            <div class="sunrise-sunset">
                <div><i class="wi wi-sunrise"></i> ${day.sunrise}</div>
                <div><i class="wi wi-sunset"></i> ${day.sunset}</div>
            </div>
            <div class="boating-day">
                <div>MORN: <span class="${day.boatingDecision.morning.isGood ? 'yes' : 'no'}">${day.boatingDecision.morning.isGood ? 'YES' : 'NO'}</span> <i class="wi ${getReasonIcon(day.boatingDecision.morning.reason)}"></i></div>
                <div>AFT: <span class="${day.boatingDecision.afternoon.isGood ? 'yes' : 'no'}">${day.boatingDecision.afternoon.isGood ? 'YES' : 'NO'}</span> <i class="wi ${getReasonIcon(day.boatingDecision.afternoon.reason)}"></i></div>
            </div>
            <p class="weather-description">${day.description}</p>
        `;
        forecastContainer.appendChild(dayDiv);
    });

    displayHourlyForecast(0, data);
    hideLoader();
}

function displayHourlyForecast(dayIndex, data) {
    document.querySelectorAll('.day-forecast').forEach((day, index) => {
        day.classList.toggle('selected', index === dayIndex);
    });

    const hourlyContainer = document.getElementById('hourly-forecast-container');
    const hourlyDetails = document.getElementById('hourly-forecast-details');
    const hourlyDay = document.getElementById('hourly-forecast-day');

    hourlyDetails.innerHTML = '';
    const dayData = data.hourly[dayIndex];
    if (!dayData || dayData.length === 0) {
        hourlyContainer.style.display = 'none';
        return;
    }

    const date = dayData[0].time;
    hourlyDay.textContent = `Hourly Forecast for ${date.toLocaleDateString('en-US', { weekday: 'long' })}`;

    dayData.forEach(hour => {
        const hourlyItem = document.createElement('div');
        hourlyItem.classList.add('hourly-item');
        const waveHtml = hour.wave ? `<div><i class="wi wi-ocean"></i> ${hour.wave}ft</div>` : '';
        const tideHtml = hour.tide ? `<div><i class="wi wi-barometer"></i> ${hour.tide}ft</div>` : '';

        hourlyItem.innerHTML = `
            <div class="time">${hour.time.toLocaleTimeString([], { hour: 'numeric', hour12: true })}</div>
            <div><i class="wi wi-thermometer"></i> ${hour.temperature}°F</div>
            <div><i class="wi wi-strong-wind"></i> ${hour.wind} mph</div>
            <div><i class="wi wi-raindrop"></i> ${hour.precipitation}%</div>
            ${waveHtml}
            ${tideHtml}
        `;
        hourlyDetails.appendChild(hourlyItem);
    });

    hourlyContainer.style.display = 'block';
    document.getElementById('charts-container').style.display = 'block';

    displayHourlyCharts(
        dayData.map(h => h.time),
        dayData.map(h => h.wind),
        dayData.map(h => h.precipitation),
        dayData.map(h => h.temperature),
        dayData.map(h => h.wave),
        data.tideData,
        data.daily[dayIndex].sunrise,
        data.daily[dayIndex].sunset
    );
}
function isGoodBoatingDayNWS(periods, hourlyDataForDay) {
    const results = { morning: { isGood: true, reason: 'clear' }, afternoon: { isGood: true, reason: 'clear' } };

    // This function will check periods or hourly data, depending on what's available
    const checkConditions = (hour, wind, precip, temp, wave) => {
        let reason = 'clear';
        if (wind > (userThresholds.maxWind * 1.151)) reason = 'wind';
        else if (precip > userThresholds.maxPrecip) reason = 'precip';
        else if (temp < userThresholds.minTemp || temp > userThresholds.maxTemp) reason = 'temp';
        else if (wave > userThresholds.maxWave) reason = 'wave';

        if (reason !== 'clear') {
            if (hour >= 8 && hour < 15) results.morning = { isGood: false, reason };
            if (hour >= 15 && hour < 20) results.afternoon = { isGood: false, reason };
        }
    };

    // NWS data can be complex. We prioritize hourly data if available for more accuracy.
    if (hourlyDataForDay && hourlyDataForDay.length > 0) {
        hourlyDataForDay.forEach(hourData => {
            checkConditions(
                hourData.time.getHours(),
                hourData.wind,
                hourData.precipitation,
                hourData.temperature,
                hourData.wave
            );
        });
    } else { // Fallback to less granular period data
        periods.forEach(period => {
            const windSpeedMatch = period.windSpeed.match(/(\d+)/);
            checkConditions(
                new Date(period.startTime).getHours(),
                windSpeedMatch ? parseInt(windSpeedMatch[0], 10) : 0,
                period.probabilityOfPrecipitation.value || 0,
                period.temperature,
                null // Wave height is not in period data, have to get from hourly
            );
        });
    }

    return results;
}
