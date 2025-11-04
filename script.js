let windChart, precipitationChart, temperatureChart, waveChart, tideChart, radarMap;
// Store the raw data from the last successful API call
let lastWeatherData = null;

// --- LOADER ---
function showLoader() {
    document.getElementById('loader-overlay').classList.add('visible');
}

function hideLoader() {
    document.getElementById('loader-overlay').classList.remove('visible');
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    // Event listener for the location search form
    const locationForm = document.getElementById('location-form');
    locationForm.addEventListener('submit', (e) => {
        e.preventDefault();
        showLoader();
        const locationInput = document.getElementById('location-input');
        geocodeAndGetWeather(locationInput.value);
    });

    // Initial weather fetch based on geolocation or default
    showLoader();
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            reverseGeocode(lat, lon);
        }, () => {
            geocodeAndGetWeather("New York"); // Default on geolocation error
        });
    } else {
        geocodeAndGetWeather("New York"); // Default if geolocation is not supported
    }

    // --- Settings Modal Logic ---
    const settingsModal = document.getElementById('settings-modal');
    const settingsIcon = document.getElementById('settings-icon');
    const closeButton = document.querySelector('.close-button');

    settingsIcon.addEventListener('click', () => settingsModal.style.display = 'block');
    closeButton.addEventListener('click', () => settingsModal.style.display = 'none');
    window.addEventListener('click', (event) => {
        if (event.target === settingsModal) {
            settingsModal.style.display = 'none';
        }
    });

    const thresholdsForm = document.getElementById('thresholds-form');
    thresholdsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        // Update thresholds from form
        userThresholds.maxWind = parseInt(document.getElementById('max-wind').value, 10);
        userThresholds.maxPrecip = parseInt(document.getElementById('max-precip').value, 10);
        userThresholds.minTemp = parseInt(document.getElementById('min-temp').value, 10);
        userThresholds.maxTemp = parseInt(document.getElementById('max-temp').value, 10);
        userThresholds.maxWave = parseFloat(document.getElementById('max-wave').value);

        // Save to local storage
        localStorage.setItem('userThresholds', JSON.stringify(userThresholds));
        settingsModal.style.display = 'none';

        // Re-render the weather display with the new thresholds
        if (lastWeatherData) {
            const transformedData = lastWeatherData.isMarine
                ? transformNwsData(lastWeatherData.data)
                : transformOpenMeteoData(lastWeatherData.data);
            displayWeather(transformedData, lastWeatherData.locationName, lastWeatherData.lat, lastWeatherData.lon);
        }
    });

    // Load saved thresholds on startup
    loadThresholds();
});


// --- CORE DATA FETCHING ---

function geocodeAndGetWeather(locationName) {
    const geocodeApiUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(locationName)}&count=1&language=en&format=json`;
    fetch(geocodeApiUrl)
        .then(response => response.json())
        .then(data => {
            if (data.results && data.results.length > 0) {
                const location = data.results[0];
                getWeatherAlerts(location.latitude, location.longitude);
                getWeather(location.latitude, location.longitude, location.name);
            } else {
                alert("Could not find location. Please try again.");
                hideLoader();
            }
        })
        .catch(error => {
            console.error('Error fetching geocoding data:', error);
            alert("An error occurred while fetching the location. Please try again.");
            hideLoader();
        });
}

async function getWeather(lat, lon, locationName) {
    const pointsApiUrl = `https://api.weather.gov/points/${lat},${lon}`;
    try {
        const pointsResponse = await fetch(pointsApiUrl, { headers: { 'User-Agent': '(canigoboatingtoday.com, admin@canigoboatingtoday.com)' } });
        const pointsData = await pointsResponse.json();

        const gridDataUrl = pointsData.properties.forecastGridData;
        const forecastUrl = pointsData.properties.forecast;
        const [gridDataResponse, forecastResponse] = await Promise.all([
            fetch(gridDataUrl, { headers: { 'User-Agent': '(canigoboatingtoday.com, admin@canigoboatingtoday.com)' } }),
            fetch(forecastUrl, { headers: { 'User-Agent': '(canigoboatingtoday.com, admin@canigoboatingtoday.com)' } })
        ]);
        const gridData = await gridDataResponse.json();
        const forecastData = await forecastResponse.json();

        const sunriseSunsetUrl = `https://api.sunrisesunset.io/json?lat=${lat}&lng=${lon}`;
        const [sunriseSunsetResponse, tideData] = await Promise.all([
            fetch(sunriseSunsetUrl),
            getTideData(lat, lon)
        ]);
        const sunriseSunsetData = await sunriseSunsetResponse.json();

        const combinedData = { ...forecastData, gridData, sunriseSunset: sunriseSunsetData.results, tideData };
        lastWeatherData = { data: combinedData, locationName, isMarine: true, lat, lon };
        const standardizedData = transformNwsData(combinedData);
        displayWeather(standardizedData, locationName, lat, lon);

    } catch (error) {
        console.error('Error fetching weather data from NWS, falling back to Open-Meteo:', error);
        const forecastApiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max,wind_speed_10m_max&hourly=temperature_2m,precipitation_probability,wind_speed_10m&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto&forecast_days=8`;
        const marineApiUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&hourly=sea_level_height_msl&timezone=auto&length_unit=imperial`;

        try {
            const [forecastData, marineData] = await Promise.all([
                fetch(forecastApiUrl).then(response => response.json()),
                fetch(marineApiUrl).then(response => response.json())
            ]);

            const combinedData = { ...forecastData };
            if (marineData && !marineData.error) {
                combinedData.marine = marineData;
            } else {
                combinedData.marine = null;
            }
            lastWeatherData = { data: combinedData, locationName, isMarine: false };
            const standardizedData = transformOpenMeteoData(combinedData);
            displayWeather(standardizedData, locationName);
        } catch (fallbackError) {
            console.error('Error fetching weather data from fallback API:', fallbackError);
            hideLoader();
        }
    }
}

function reverseGeocode(lat, lon) {
    const reverseGeocodeApiUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
    fetch(reverseGeocodeApiUrl)
        .then(response => response.json())
        .then(data => {
            const locationName = data.city ? `${data.city}, ${data.principalSubdivision}` : "Current Location";
            getWeatherAlerts(lat, lon);
            getWeather(lat, lon, locationName);
        })
        .catch(error => {
            console.error('Error fetching reverse geocoding data:', error);
            getWeather(lat, lon, "Current Location"); // Fallback
        });
}

function getWeatherAlerts(lat, lon) {
    const alertsApiUrl = `https://api.weather.gov/alerts/active?point=${lat},${lon}`;
    fetch(alertsApiUrl, { headers: { 'User-Agent': '(canigoboatingtoday.com, admin@canigoboatingtoday.com)' } })
        .then(response => response.json())
        .then(alertData => displayWeatherAlerts(alertData))
        .catch(error => console.error('Error fetching weather alerts:', error));
}

async function getTideData(lat, lon) {
    try {
        // Using a CORS proxy to bypass browser restrictions on direct API calls.
        const stationsApiUrl = 'https://api.tidesandcurrents.noaa.gov/api/prod/stations.json?type=tidepredictions&units=english';
        const stationsUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(stationsApiUrl)}`;

        const stationsResponse = await fetch(stationsUrl);
        if (!stationsResponse.ok) throw new Error(`Failed to fetch stations: ${stationsResponse.statusText}`);

        // Fetch as text first for robust parsing
        const stationsText = await stationsResponse.text();
        if (!stationsText) throw new Error('Empty station data response from proxy.');
        const stationsData = JSON.parse(stationsText);

        let nearestStation = null;
        let minDistance = Infinity;
        stationsData.stations.forEach(station => {
            const distance = Math.sqrt(Math.pow(lat - station.lat, 2) + Math.pow(lon - station.lng, 2));
            if (distance < minDistance) {
                minDistance = distance;
                nearestStation = station;
            }
        });

        if (!nearestStation) return null;

        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const formatDate = (date) => `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;

        const tideApiUrl = `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?begin_date=${formatDate(today)}&end_date=${formatDate(tomorrow)}&station=${nearestStation.id}&product=predictions&datum=MLLW&time_zone=lst_ldt&interval=h&units=english&format=json`;
        const tideDataUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(tideApiUrl)}`;

        const tideResponse = await fetch(tideDataUrl);
        if (!tideResponse.ok) throw new Error(`Failed to fetch tide data: ${tideResponse.statusText}`);

        const tideText = await tideResponse.text();
        if (!tideText) throw new Error('Empty tide data response from proxy.');
        const tideData = JSON.parse(tideText);

        return tideData.predictions || null;
    } catch (error) {
        console.error('Error fetching or parsing tide data:', error);
        return null;
    }
}

// --- DATA TRANSFORMATION LAYER ---

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

// --- UI DISPLAY ---

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

function displayHourlyCharts(timeData, windData, precipitationData, temperatureData, waveData, tideData, sunrise, sunset) {
    [windChart, precipitationChart, temperatureChart, waveChart, tideChart].forEach(chart => chart?.destroy());

    const labels = timeData.map(t => new Date(t).toLocaleTimeString([], { hour: 'numeric', hour12: true }));
    const sunriseIcon = new Image(24, 24); sunriseIcon.src = 'icons/sunrise.svg';
    const sunsetIcon = new Image(24, 24); sunsetIcon.src = 'icons/sunset.svg';

    const timeDataMs = timeData.map(t => new Date(t).getTime());
    let sunriseToParse = sunrise, sunsetToParse = sunset;
    if ((sunrise.includes('AM') || sunrise.includes('PM')) && timeData.length > 0) {
        const forecastDate = new Date(timeData[0]).toDateString();
        sunriseToParse = `${forecastDate} ${sunrise}`;
        sunsetToParse = `${forecastDate} ${sunset}`;
    }
    const sunriseMs = new Date(sunriseToParse).getTime();
    const sunsetMs = new Date(sunsetToParse).getTime();
    const findClosestIndex = (times, target) => times.reduce((prev, curr, i) => Math.abs(target-curr) < Math.abs(target-times[prev]) ? i : prev, 0);
    const sunriseIndex = findClosestIndex(timeDataMs, sunriseMs);
    const sunsetIndex = findClosestIndex(timeDataMs, sunsetMs);

    const getCommonOptions = (title) => ({
        responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
        plugins: { legend: { display: false }, tooltip: { enabled: true } },
        scales: {
            x: { ticks: { color: 'rgba(255, 255, 255, 0.8)' }, grid: { color: 'rgba(255, 255, 255, 0.1)' } },
            y: { ticks: { color: 'rgba(255, 255, 255, 0.8)' }, grid: { color: 'rgba(255, 255, 255, 0.1)' }, title: { display: true, text: title, color: 'rgba(255, 255, 255, 0.8)' } }
        },
    });

    const getAnnotationOptions = (data, icon, index) => ({ type: 'point', xValue: index, yValue: data[index], pointStyle: icon });

    const windOptions = getCommonOptions('Wind Speed (mph)');
    windOptions.scales.y.min = 0;
    windOptions.plugins.annotation = { annotations: { sunrise: getAnnotationOptions(windData, sunriseIcon, sunriseIndex), sunset: getAnnotationOptions(windData, sunsetIcon, sunsetIndex) }};
    windChart = new Chart(document.getElementById('wind-chart').getContext('2d'), { type: 'line', data: { labels, datasets: [{ label: 'Wind Speed', data: windData, borderColor: 'rgba(255, 99, 132, 0.8)', backgroundColor: 'rgba(255, 99, 132, 0.2)', fill: true, tension: 0.4 }] }, options: windOptions });

    const precipOptions = getCommonOptions('Precipitation (%)');
    precipOptions.scales.y.min = 0; precipOptions.scales.y.max = 100;
    precipOptions.plugins.annotation = { annotations: { sunrise: getAnnotationOptions(precipitationData, sunriseIcon, sunriseIndex), sunset: getAnnotationOptions(precipitationData, sunsetIcon, sunsetIndex) }};
    precipitationChart = new Chart(document.getElementById('precipitation-chart').getContext('2d'), { type: 'line', data: { labels, datasets: [{ label: 'Precipitation', data: precipitationData, borderColor: 'rgba(54, 162, 235, 0.8)', backgroundColor: 'rgba(54, 162, 235, 0.2)', fill: true, tension: 0.4 }] }, options: precipOptions });

    const tempOptions = getCommonOptions('Temperature (°F)');
    tempOptions.plugins.annotation = { annotations: { sunrise: getAnnotationOptions(temperatureData, sunriseIcon, sunriseIndex), sunset: getAnnotationOptions(temperatureData, sunsetIcon, sunsetIndex) }};
    temperatureChart = new Chart(document.getElementById('temperature-chart').getContext('2d'), { type: 'line', data: { labels, datasets: [{ label: 'Temperature', data: temperatureData, borderColor: 'rgba(255, 206, 86, 0.8)', backgroundColor: 'rgba(255, 206, 86, 0.2)', fill: true, tension: 0.4 }] }, options: tempOptions });

    const waveChartElement = document.getElementById('wave-chart');
    if (waveData && waveData.some(w => w !== null && !isNaN(w))) {
        waveChartElement.parentElement.style.display = 'block';
        const waveOptions = getCommonOptions('Wave Height (ft)');
        waveOptions.plugins.annotation = { annotations: { sunrise: getAnnotationOptions(waveData, sunriseIcon, sunriseIndex), sunset: getAnnotationOptions(waveData, sunsetIcon, sunsetIndex) }};
        waveChart = new Chart(waveChartElement.getContext('2d'), { type: 'line', data: { labels, datasets: [{ label: 'Wave Height', data: waveData, borderColor: 'rgba(75, 192, 192, 0.8)', backgroundColor: 'rgba(75, 192, 192, 0.2)', fill: true, tension: 0.4 }] }, options: waveOptions });
    } else {
        waveChartElement.parentElement.style.display = 'none';
    }

    const tideChartElement = document.getElementById('tide-chart');
    const tideDisclaimer = document.querySelector('.tide-disclaimer');
    if (tideData && tideData.length > 0) {
        tideChartElement.parentElement.style.display = 'block';
        tideDisclaimer.style.display = 'block';
        const alignedTideData = labels.map(label => {
            const labelDate = new Date(`${timeData[0].toDateString()} ${label}`);
            let closestTide = null, minDiff = Infinity;
            tideData.forEach(tidePoint => {
                const diff = Math.abs(labelDate - new Date(tidePoint.t));
                if (diff < minDiff) { minDiff = diff; closestTide = parseFloat(tidePoint.v); }
            });
            return closestTide;
        });
        const tideOptions = getCommonOptions('Tide (ft MLLW)');
        tideOptions.plugins.annotation = { annotations: { sunrise: getAnnotationOptions(alignedTideData, sunriseIcon, sunriseIndex), sunset: getAnnotationOptions(alignedTideData, sunsetIcon, sunsetIndex) }};
        tideChart = new Chart(tideChartElement.getContext('2d'), { type: 'line', data: { labels, datasets: [{ label: 'Tide', data: alignedTideData, borderColor: 'rgba(153, 102, 255, 0.8)', backgroundColor: 'rgba(153, 102, 255, 0.2)', fill: true, tension: 0.4 }] }, options: tideOptions });
    } else {
        tideChartElement.parentElement.style.display = 'none';
        tideDisclaimer.style.display = 'none';
    }
}

function displayWeatherAlerts(alertData) {
    const alertsContainer = document.getElementById('weather-alerts');
    alertsContainer.innerHTML = '';
    if (alertData.features && alertData.features.length > 0) {
        alertData.features.forEach(alert => {
            const alertDiv = document.createElement('div');
            alertDiv.classList.add('weather-alert', `weather-alert-${alert.properties.severity.toLowerCase()}`);
            alertDiv.innerHTML = `<h3>${alert.properties.headline}</h3><p><strong>Effective:</strong> ${new Date(alert.properties.effective).toLocaleString()}</p><p>${alert.properties.description}</p>`;
            alertsContainer.appendChild(alertDiv);
        });
    }
}

function displayRadarMap(lat, lon) {
    const radarContainer = document.getElementById('radar-map-container');
    radarContainer.innerHTML = ''; radarContainer.style.height = '400px';
    if (radarMap) radarMap.remove();
    radarMap = L.map('radar-map-container').setView([lat, lon], 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(radarMap);
    L.tileLayer.wms('https://opengeo.ncep.noaa.gov/geoserver/MRMS/wms', { layers: 'CREF', format: 'image/png', transparent: true, opacity: 0.8, time: new Date().toISOString(), attribution: 'NWS' }).addTo(radarMap);
}

// --- WEATHER LOGIC ---
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

function isGoodBoatingDay(hourly, dayIndex) {
    const results = { morning: { isGood: true, reason: 'clear' }, afternoon: { isGood: true, reason: 'clear' } };
    const startIndex = dayIndex * 24, endIndex = startIndex + 24;
    for (let i = startIndex; i < endIndex && i < hourly.time.length; i++) {
        const hour = new Date(hourly.time[i]).getHours();
        let reason = 'clear';
        if (hourly.wind_speed_10m[i] > (userThresholds.maxWind * 1.151)) reason = 'wind';
        else if (hourly.precipitation_probability[i] > userThresholds.maxPrecip) reason = 'precip';
        else if (hourly.temperature_2m[i] < userThresholds.minTemp || hourly.temperature_2m[i] > userThresholds.maxTemp) reason = 'temp';
        if (reason !== 'clear') {
            if (hour >= 8 && hour < 15) results.morning = { isGood: false, reason };
            if (hour >= 15 && hour < 20) results.afternoon = { isGood: false, reason };
        }
    }
    return results;
}

function getReasonIcon(reason) {
    const icons = { wind: 'wi-strong-wind', precip: 'wi-raindrop', temp: 'wi-thermometer', wave: 'wi-ocean', clear: 'wi-day-sunny' };
    return icons[reason] || 'wi-day-sunny';
}

// --- MAPPERS ---
function mapNwsIconToAppIcon(iconUrl) {
    const mapping = { "skc": "sun", "few": "cloudy", "sct": "cloudy", "bkn": "cloudy", "ovc": "cloudy", "wind_skc": "sun", "wind_few": "cloudy", "wind_sct": "cloudy", "wind_bkn": "cloudy", "wind_ovc": "cloudy", "snow": "snow", "rain_snow": "rain", "rain_sleet": "rain", "snow_sleet": "snow", "fzra": "rain", "rain_fzra": "rain", "snow_fzra": "snow", "sleet": "rain", "rain": "rain", "rain_showers": "showers", "rain_showers_hi": "showers", "tsra": "thunderstorm", "tsra_sct": "thunderstorm", "tsra_hi": "thunderstorm", "tornado": "thunderstorm", "hurricane": "thunderstorm", "tropical_storm": "thunderstorm", "dust": "fog", "smoke": "fog", "haze": "fog", "hot": "sun", "cold": "sun", "blizzard": "snow", "fog": "fog" };
    const key = Object.keys(mapping).find(key => iconUrl.includes(key));
    return `icons/${mapping[key] || 'cloudy'}.svg`;
}

function getWeatherIcon(code) {
    const icons = { 0: 'sun', 1: 'cloudy', 2: 'cloudy', 3: 'cloudy', 45: 'fog', 48: 'fog', 51: 'rain', 53: 'rain', 55: 'rain', 56: 'rain', 57: 'rain', 61: 'rain', 63: 'rain', 65: 'rain', 66: 'rain', 67: 'rain', 71: 'snow', 73: 'snow', 75: 'snow', 77: 'snow', 80: 'showers', 81: 'showers', 82: 'showers', 85: 'snow', 86: 'snow', 95: 'thunderstorm', 96: 'thunderstorm', 99: 'thunderstorm' };
    return `icons/${icons[code] || 'cloudy'}.svg`;
}

function getWeatherDescription(code) {
    const descriptions = { 0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast', 45: 'Fog', 48: 'Fog', 51: 'Drizzle', 53: 'Drizzle', 55: 'Drizzle', 61: 'Rain', 63: 'Rain', 65: 'Rain', 71: 'Snow', 73: 'Snow', 75: 'Snow', 77: 'Snow grains', 80: 'Rain showers', 81: 'Rain showers', 82: 'Rain showers', 85: 'Snow showers', 86: 'Snow showers', 95: 'Thunderstorm', 96: 'Thunderstorm', 99: 'Thunderstorm' };
    return descriptions[code] || 'No description available.';
}

// --- SETTINGS ---
let userThresholds = { maxWind: 12, maxPrecip: 25, minTemp: 60, maxTemp: 90, maxWave: 4 };
function loadThresholds() {
    const saved = localStorage.getItem('userThresholds');
    if (saved) {
        const savedThresholds = JSON.parse(saved);
        // Merge saved settings with defaults to ensure new settings are not missed
        userThresholds = { ...userThresholds, ...savedThresholds };
    }
    document.getElementById('max-wind').value = userThresholds.maxWind;
    document.getElementById('max-precip').value = userThresholds.maxPrecip;
    document.getElementById('min-temp').value = userThresholds.minTemp;
    document.getElementById('max-temp').value = userThresholds.maxTemp;
    document.getElementById('max-wave').value = userThresholds.maxWave;
}
