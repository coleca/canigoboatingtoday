let windChart, precipitationChart, temperatureChart, waveChart, tideChart, radarMap;
let lastWeatherData = null;

function showLoader() {
    document.getElementById('loader-overlay').classList.add('visible');
}

function hideLoader() {
    document.getElementById('loader-overlay').classList.remove('visible');
}

document.addEventListener('DOMContentLoaded', () => {
    const locationForm = document.getElementById('location-form');
    locationForm.addEventListener('submit', (e) => {
        e.preventDefault();
        showLoader();
        const locationInput = document.getElementById('location-input');
        geocodeAndGetWeather(locationInput.value);
    });

    showLoader();
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            reverseGeocode(lat, lon);
        }, error => {
            console.error("Error getting location: ", error);
            geocodeAndGetWeather("New York");
        });
    } else {
        console.error("Geolocation is not supported by this browser.");
        geocodeAndGetWeather("New York");
    }

    // Settings Modal Logic
    const settingsModal = document.getElementById('settings-modal');
    const settingsIcon = document.getElementById('settings-icon');
    const closeButton = document.querySelector('.close-button');

    settingsIcon.addEventListener('click', () => {
        settingsModal.style.display = 'block';
    });

    closeButton.addEventListener('click', () => {
        settingsModal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target === settingsModal) {
            settingsModal.style.display = 'none';
        }
    });

    const thresholdsForm = document.getElementById('thresholds-form');
    thresholdsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        userThresholds.maxWind = parseInt(document.getElementById('max-wind').value, 10);
        userThresholds.maxPrecip = parseInt(document.getElementById('max-precip').value, 10);
        userThresholds.minTemp = parseInt(document.getElementById('min-temp').value, 10);
        userThresholds.maxTemp = parseInt(document.getElementById('max-temp').value, 10);

        localStorage.setItem('userThresholds', JSON.stringify(userThresholds));
        settingsModal.style.display = 'none';

        if (lastWeatherData) {
            displayWeather(lastWeatherData.data, lastWeatherData.locationName);
        }
    });

    function loadThresholds() {
        const savedThresholds = localStorage.getItem('userThresholds');
        if (savedThresholds) {
            userThresholds = JSON.parse(savedThresholds);
        }
        document.getElementById('max-wind').value = userThresholds.maxWind;
        document.getElementById('max-precip').value = userThresholds.maxPrecip;
        document.getElementById('min-temp').value = userThresholds.minTemp;
        document.getElementById('max-temp').value = userThresholds.maxTemp;
    }

    loadThresholds();
});

function geocodeAndGetWeather(locationName) {
    const geocodeApiUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${locationName}&count=1&language=en&format=json`;

    fetch(geocodeApiUrl)
        .then(response => response.json())
        .then(data => {
            if (data.results && data.results.length > 0) {
                const location = data.results[0];
                getWeatherAlerts(location.latitude, location.longitude);
                getWeather(location.latitude, location.longitude, location.name);
            } else {
                alert("Could not find location. Please try again.");
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
        const pointsResponse = await fetch(pointsApiUrl, {
            headers: { 'User-Agent': '(canigoboatingtoday.com, contact@canigoboatingtoday.com)' }
        });
        const pointsData = await pointsResponse.json();
        const gridDataUrl = pointsData.properties.forecastGridData;

        const gridDataResponse = await fetch(gridDataUrl, {
            headers: { 'User-Agent': '(canigoboatingtoday.com, contact@canigoboatingtoday.com)' }
        });
        const gridData = await gridDataResponse.json();

        // Also fetch the regular forecast for text descriptions and periods
        const forecastUrl = pointsData.properties.forecast;
        const forecastResponse = await fetch(forecastUrl, {
            headers: { 'User-Agent': '(canigoboatingtoday.com, contact@canigoboatingtoday.com)' }
        });
        const forecastData = await forecastResponse.json();

        const sunriseSunsetUrl = `https://api.sunrisesunset.io/json?lat=${lat}&lng=${lon}`;
        const sunriseSunsetResponse = await fetch(sunriseSunsetUrl);
        const sunriseSunsetData = await sunriseSunsetResponse.json();

        const tideData = await getTideData(lat, lon);

        const combinedData = { ...forecastData, gridData, sunriseSunset: sunriseSunsetData.results, tideData };

        lastWeatherData = { data: combinedData, locationName: locationName, marine: true };
        displayWeather(combinedData, locationName, lat, lon);

    } catch (error) {
        console.error('Error fetching weather data from NWS:', error);
        // Fallback to Open-Meteo
        const forecastApiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max,wind_speed_10m_max&hourly=temperature_2m,precipitation_probability,wind_speed_10m&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto&forecast_days=8`;
        const marineApiUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&hourly=sea_level_height_msl&timezone=auto&length_unit=imperial`;

        Promise.all([
            fetch(forecastApiUrl).then(response => response.json()),
            fetch(marineApiUrl).then(response => response.json())
        ])
        .then(([forecastData, marineData]) => {
            const combinedData = { ...forecastData };
            if (marineData && !marineData.error) {
                combinedData.marine = marineData;
            } else {
                console.warn("Could not retrieve marine data. This is expected for inland locations.");
                combinedData.marine = null;
            }
            lastWeatherData = { data: combinedData, locationName: locationName };
            displayWeather(combinedData, locationName);
        })
        .catch(error => {
            console.error('Error fetching weather data:', error);
            hideLoader();
        });
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

    fetch(alertsApiUrl, {
        headers: {
            'User-Agent': '(canigoboatingtoday.com, contact@canigoboatingtoday.com)'
        }
    })
        .then(response => response.json())
        .then(alertData => {
            displayWeatherAlerts(alertData);
        })
        .catch(error => console.error('Error fetching weather alerts:', error));
}

async function getTideData(lat, lon) {
    // NOTE: This function fetches the entire list of tide stations on the client-side
    // to find the nearest one. This is inefficient and can cause significant latency.
    // For a production application, a more efficient solution, such as a dedicated
    // backend service or a more targeted API query, should be used.
    try {
        // 1. Fetch all tide prediction stations
        const stationsUrl = 'https://corsproxy.io/?https://api.tidesandcurrents.noaa.gov/mdapi/v1/webapi/stations.json?type=tidepredictions&units=english';
        const stationsResponse = await fetch(stationsUrl);
        const stationsData = await stationsResponse.json();

        // 2. Find the nearest station
        let nearestStation = null;
        let minDistance = Infinity;

        stationsData.stations.forEach(station => {
            const distance = Math.sqrt(Math.pow(lat - station.lat, 2) + Math.pow(lon - station.lng, 2));
            if (distance < minDistance) {
                minDistance = distance;
                nearestStation = station;
            }
        });

        if (!nearestStation) {
            console.warn("Could not find a nearby tide station.");
            return null;
        }

        // 3. Fetch tide data for the nearest station for the next 24 hours
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const formatDate = (date) => {
            return `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;
        };

        const tideDataUrl = `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?begin_date=${formatDate(today)}&end_date=${formatDate(tomorrow)}&station=${nearestStation.id}&product=predictions&datum=MLLW&time_zone=lst_ldt&interval=h&units=english&format=json`;

        const tideResponse = await fetch(tideDataUrl);
        const tideData = await tideResponse.json();

        return tideData.predictions || null;

    } catch (error) {
        console.error('Error fetching tide data:', error);
        return null;
    }
}


function displayWeatherAlerts(alertData) {
    const alertsContainer = document.getElementById('weather-alerts');
    alertsContainer.innerHTML = '';

    if (alertData.features && alertData.features.length > 0) {
        alertData.features.forEach(alert => {
            const alertDiv = document.createElement('div');
            alertDiv.classList.add('weather-alert');
            alertDiv.classList.add(`weather-alert-${alert.properties.severity.toLowerCase()}`);
            alertDiv.innerHTML = `
                <h3>${alert.properties.headline}</h3>
                <p><strong>Effective:</strong> ${new Date(alert.properties.effective).toLocaleString()}</p>
                <p>${alert.properties.description}</p>
            `;
            alertsContainer.appendChild(alertDiv);
        });
    }
}

function displayWeather(data, locationName, lat, lon) {
    const currentLocationElement = document.getElementById('current-location');
    currentLocationElement.textContent = `Weather for: ${locationName}`;

    const forecastContainer = document.getElementById('weather-forecast');
    forecastContainer.innerHTML = '';

    if (lat && lon) {
        displayRadarMap(lat, lon);
    }

    if (lastWeatherData.marine) { // NWS data source
        const periods = data.properties.periods;

        // Group periods by day
        const days = {};
        periods.forEach(period => {
            const date = new Date(period.startTime).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
            if (!days[date]) {
                days[date] = [];
            }
            days[date].push(period);
        });

        const dayKeys = Object.keys(days).slice(0, 8);

        dayKeys.forEach((dateKey, index) => {
            const dayPeriods = days[dateKey];
            const dayDiv = document.createElement('div');
            dayDiv.classList.add('day-forecast');
            dayDiv.addEventListener('click', () => displayHourlyForecast(index, data));

            const date = new Date(dayPeriods[0].startTime);
            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

            const dayNameElement = document.createElement('h2');
            dayNameElement.textContent = dayName;

            const temps = dayPeriods.map(p => p.temperature);
            const maxTemp = Math.max(...temps);
            const minTemp = Math.min(...temps);

            const weatherIcon = document.createElement('img');
            weatherIcon.src = mapNwsIconToAppIcon(dayPeriods.find(p => p.isDaytime)?.icon || dayPeriods[0].icon);
            weatherIcon.alt = 'Weather icon';

            const tempElement = document.createElement('p');
            tempElement.classList.add('temp');
            tempElement.innerHTML = `<span class="max">${Math.round(maxTemp)}°F</span> / ${Math.round(minTemp)}°F`;

            const sunriseSunsetElement = document.createElement('div');
            sunriseSunsetElement.classList.add('sunrise-sunset');
            if (data.sunriseSunset) {
                sunriseSunsetElement.innerHTML = `<div><i class="wi wi-sunrise"></i> ${data.sunriseSunset.sunrise}</div><div><i class="wi wi-sunset"></i> ${data.sunriseSunset.sunset}</div>`;
            } else {
                sunriseSunsetElement.innerHTML = `<div>&nbsp;</div><div>&nbsp;</div>`; // Placeholder
            }

            const goodBoatingDay = isGoodBoatingDayNWS(dayPeriods);
            const boatingDayElement = document.createElement('div');
            boatingDayElement.classList.add('boating-day');
            boatingDayElement.innerHTML = `
                <div>MORN: <span class="${goodBoatingDay.morning.isGood ? 'yes' : 'no'}">${goodBoatingDay.morning.isGood ? 'YES' : 'NO'}</span> <i class="wi ${getReasonIcon(goodBoatingDay.morning.reason)}"></i></div>
                <div>AFT: <span class="${goodBoatingDay.afternoon.isGood ? 'yes' : 'no'}">${goodBoatingDay.afternoon.isGood ? 'YES' : 'NO'}</span> <i class="wi ${getReasonIcon(goodBoatingDay.afternoon.reason)}"></i></div>
            `;

            dayDiv.appendChild(dayNameElement);
            dayDiv.appendChild(weatherIcon);
            dayDiv.appendChild(tempElement);
            dayDiv.appendChild(sunriseSunsetElement);
            dayDiv.appendChild(boatingDayElement);

            const weatherDescriptionElement = document.createElement('p');
            weatherDescriptionElement.classList.add('weather-description');
            weatherDescriptionElement.textContent = dayPeriods.find(p => p.isDaytime)?.shortForecast || dayPeriods[0].shortForecast;
            dayDiv.appendChild(weatherDescriptionElement);

            forecastContainer.appendChild(dayDiv);
        });

        displayHourlyForecast(0, data);
        hideLoader();

    } else { // Open-Meteo data source
        const daily = data.daily;
        const hourly = data.hourly;

        for (let i = 0; i < daily.time.length; i++) {
            const dayDiv = document.createElement('div');
            dayDiv.classList.add('day-forecast');
            dayDiv.addEventListener('click', () => displayHourlyForecast(i, data));

            const date = new Date(daily.time[i] + 'T00:00');
            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

            const dayNameElement = document.createElement('h2');
            dayNameElement.textContent = dayName;

            const weatherIcon = document.createElement('img');
            weatherIcon.src = getWeatherIcon(daily.weather_code[i]);
            weatherIcon.alt = 'Weather icon';

            const tempElement = document.createElement('p');
            tempElement.classList.add('temp');
            tempElement.innerHTML = `<span class="max">${Math.round(daily.temperature_2m_max[i])}°F</span> / ${Math.round(daily.temperature_2m_min[i])}°F`;

            const sunrise = new Date(daily.sunrise[i]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const sunset = new Date(daily.sunset[i]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const sunriseSunsetElement = document.createElement('div');
            sunriseSunsetElement.classList.add('sunrise-sunset');
            sunriseSunsetElement.innerHTML = `<div><i class="wi wi-sunrise"></i> ${sunrise}</div><div><i class="wi wi-sunset"></i> ${sunset}</div>`;

            const goodBoatingDay = isGoodBoatingDay(hourly, i);
            const boatingDayElement = document.createElement('div');
            boatingDayElement.classList.add('boating-day');
            boatingDayElement.innerHTML = `
                <div>MORN: <span class="${goodBoatingDay.morning.isGood ? 'yes' : 'no'}">${goodBoatingDay.morning.isGood ? 'YES' : 'NO'}</span> <i class="wi ${getReasonIcon(goodBoatingDay.morning.reason)}"></i></div>
                <div>AFT: <span class="${goodBoatingDay.afternoon.isGood ? 'yes' : 'no'}">${goodBoatingDay.afternoon.isGood ? 'YES' : 'NO'}</span> <i class="wi ${getReasonIcon(goodBoatingDay.afternoon.reason)}"></i></div>
            `;

            dayDiv.appendChild(dayNameElement);
            dayDiv.appendChild(weatherIcon);
            dayDiv.appendChild(tempElement);
            dayDiv.appendChild(sunriseSunsetElement);
            dayDiv.appendChild(boatingDayElement);

            const weatherDescriptionElement = document.createElement('p');
            weatherDescriptionElement.classList.add('weather-description');
            weatherDescriptionElement.textContent = getWeatherDescription(daily.weather_code[i]);
            dayDiv.appendChild(weatherDescriptionElement);

            forecastContainer.appendChild(dayDiv);
        }

        displayHourlyForecast(0, data);
        hideLoader();
    }
}

function displayHourlyForecast(dayIndex, data) {
    const allDays = document.querySelectorAll('.day-forecast');
    allDays.forEach(day => day.classList.remove('selected'));
    if (allDays[dayIndex]) {
        allDays[dayIndex].classList.add('selected');
    }

    const hourlyContainer = document.getElementById('hourly-forecast-container');
    const hourlyDetails = document.getElementById('hourly-forecast-details');
    const hourlyDay = document.getElementById('hourly-forecast-day');

    hourlyDetails.innerHTML = '';
    const existingDescription = hourlyContainer.querySelector('.weather-description');
    if (existingDescription) {
        existingDescription.remove();
    }

    if (lastWeatherData.marine) { // NWS Data
        const gridData = data.gridData.properties;
        const temperatureData = gridData.temperature.values;
        const windData = gridData.windSpeed.values;
        const precipData = gridData.probabilityOfPrecipitation.values;
        const waveDataRaw = gridData.waveHeight.values;

        // Group by day
        const days = {};
        temperatureData.forEach(item => {
            const date = new Date(item.validTime.split('/')[0]).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
            if (!days[date]) {
                days[date] = {
                    time: [],
                    temperature: [],
                    wind: [],
                    precipitation: [],
                    wave: [] // Add wave height array
                };
            }
            days[date].time.push(new Date(item.validTime.split('/')[0]));
            days[date].temperature.push(item.value);
        });
        windData.forEach(item => {
            const date = new Date(item.validTime.split('/')[0]).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
            if (days[date]) {
                days[date].wind.push(item.value);
            }
        });
        precipData.forEach(item => {
            const date = new Date(item.validTime.split('/')[0]).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
            if (days[date]) {
                days[date].precipitation.push(item.value);
            }
        });
         waveDataRaw.forEach(item => {
            const startDate = new Date(item.validTime.split('/')[0]);
            const durationMatch = item.validTime.match(/P(\d+)DT(\d+)H/);
            if (!durationMatch) return; // Skip if format is not as expected

            const daysDuration = parseInt(durationMatch[1], 10);
            const hoursDuration = parseInt(durationMatch[2], 10);
            const endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + daysDuration);
            endDate.setHours(startDate.getHours() + hoursDuration);

            for (let d = new Date(startDate); d < endDate; d.setHours(d.getHours() + 1)) {
                 const dateKey = d.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
                 if (days[dateKey]) {
                    // Find the correct index to insert the wave height
                    const hour = d.getHours();
                    const targetIndex = days[dateKey].time.findIndex(t => t.getHours() === hour);
                    if (targetIndex !== -1) {
                         days[dateKey].wave[targetIndex] = item.value;
                    }
                 }
            }
        });


        const dayKeys = Object.keys(days);
        const selectedDayKey = dayKeys[dayIndex];
        if (!selectedDayKey) return;

        const dayData = days[selectedDayKey];
        const date = new Date(dayData.time[0]);
        hourlyDay.textContent = `Hourly Forecast for ${date.toLocaleDateString('en-US', { weekday: 'long' })}`;

        for (let i = 0; i < dayData.time.length; i++) {
            const hourlyItem = document.createElement('div');
            hourlyItem.classList.add('hourly-item');
            const waveHeight = dayData.wave[i];
            const waveHtml = waveHeight !== undefined ? `<div><i class="wi wi-ocean"></i> ${(waveHeight * 3.28084).toFixed(1)}ft</div>` : '';

            let tideHtml = '';
            if (data.tideData && data.tideData.length > 0) {
                const currentTime = dayData.time[i];
                let closestTide = null;
                let minDiff = Infinity;
                data.tideData.forEach(tidePoint => {
                    const tideTime = new Date(tidePoint.t);
                    const diff = Math.abs(currentTime - tideTime);
                    if (diff < minDiff) {
                        minDiff = diff;
                        closestTide = parseFloat(tidePoint.v);
                    }
                });
                if (closestTide !== null) {
                    tideHtml = `<div><i class="wi wi-barometer"></i> ${closestTide.toFixed(2)}ft</div>`;
                }
            }


            hourlyItem.innerHTML = `
                <div class="time">${dayData.time[i].toLocaleTimeString([], { hour: 'numeric', hour12: true })}</div>
                <div><i class="wi wi-thermometer"></i> ${Math.round(dayData.temperature[i] * 9/5 + 32)}°F</div>
                <div><i class="wi wi-strong-wind"></i> ${Math.round(dayData.wind[i] * 0.621371)} mph</div>
                <div><i class="wi wi-raindrop"></i> ${dayData.precipitation[i]}%</div>
                ${waveHtml}
                ${tideHtml}
            `;
            hourlyDetails.appendChild(hourlyItem);
        }

        hourlyContainer.style.display = 'block';
        document.getElementById('charts-container').style.display = 'block';
        document.querySelector('.tide-disclaimer').style.display = 'none';

        displayHourlyCharts(
            dayData.time,
            dayData.wind.map(w => Math.round(w * 0.621371)),
            dayData.precipitation,
            dayData.temperature.map(t => Math.round(t * 9/5 + 32)),
            dayData.wave.map(w => w !== undefined ? (w * 3.28084).toFixed(1) : null),
            data.tideData,
            data.sunriseSunset.sunrise,
            data.sunriseSunset.sunset
        );

    } else { // Open-Meteo data
        const date = new Date(data.daily.time[dayIndex] + 'T00:00');
        hourlyDay.textContent = `Hourly Forecast for ${date.toLocaleDateString('en-US', { weekday: 'long' })}`;

        const startIndex = dayIndex * 24;
        const endIndex = startIndex + 24;

        for (let i = startIndex; i < endIndex && i < data.hourly.time.length; i++) {
            const hourlyItem = document.createElement('div');
            hourlyItem.classList.add('hourly-item');
            const hour = new Date(data.hourly.time[i]).getHours();
            hourlyItem.id = `hourly-item-${hour}`;

            const time = new Date(data.hourly.time[i]).toLocaleTimeString([], { hour: 'numeric', hour12: true });
            const windSpeed = data.hourly.wind_speed_10m[i];
            const precipitation = data.hourly.precipitation_probability[i];

            let tideHtml = '';
            if (data.marine && data.marine.hourly && data.marine.hourly.sea_level_height_msl) {
                const tide = data.marine.hourly.sea_level_height_msl[i];
                if (tide !== null && !isNaN(tide)) {
                    tideHtml = `<div><i class="wi wi-barometer"></i> ${tide.toFixed(2)}ft</div>`;
                }
            }

            hourlyItem.innerHTML = `
                <div class="time">${time}</div>
                <div><i class="wi wi-strong-wind"></i> ${Math.round(windSpeed)} mph</div>
                <div><i class="wi wi-raindrop"></i> ${precipitation}%</div>
                ${tideHtml}
            `;
            hourlyDetails.appendChild(hourlyItem);
        }

        hourlyContainer.style.display = 'block';
        document.querySelector('.tide-disclaimer').style.display = (data.marine ? 'block' : 'none');

        if (dayIndex === 0) {
            const currentHour = new Date().getHours();
            const currentHourElement = document.getElementById(`hourly-item-${currentHour}`);
            if (currentHourElement) {
                setTimeout(() => {
                    currentHourElement.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                }, 100);
            }
        }

        const chartsContainer = document.getElementById('charts-container');
        const hourlyTimeData = data.hourly.time.slice(startIndex, endIndex);
        const hourlyWindData = data.hourly.wind_speed_10m.slice(startIndex, endIndex);
        const hourlyPrecipitationData = data.hourly.precipitation_probability.slice(startIndex, endIndex);
        const hourlyTemperatureData = data.hourly.temperature_2m.slice(startIndex, endIndex);
        const sunrise = data.daily.sunrise[dayIndex];
        const sunset = data.daily.sunset[dayIndex];

        let hourlyTideData = null;
        let hasTideData = false;

        if (data.marine && data.marine.hourly && data.marine.hourly.sea_level_height_msl) {
            hourlyTideData = data.marine.hourly.sea_level_height_msl.slice(startIndex, endIndex);
            hasTideData = hourlyTideData.some(tide => tide !== null && !isNaN(tide));
        }

        const tideChartElement = document.getElementById('tide-chart');
        if (tideChartElement) {
            tideChartElement.parentElement.style.display = hasTideData ? 'block' : 'none';
        }
        document.querySelector('.tide-disclaimer').style.display = hasTideData ? 'block' : 'none';

        chartsContainer.style.display = 'block';
        displayHourlyCharts(hourlyTimeData, hourlyWindData, hourlyPrecipitationData, hourlyTemperatureData, hourlyTideData, sunrise, sunset);
    }
}

function displayHourlyCharts(timeData, windData, precipitationData, temperatureData, waveData, tideData, sunrise, sunset) {
    if (windChart) windChart.destroy();
    if (precipitationChart) precipitationChart.destroy();
    if (temperatureChart) temperatureChart.destroy();
    if (waveChart) waveChart.destroy();
    if (tideChart) tideChart.destroy();

    const labels = timeData.map(t => new Date(t).toLocaleTimeString([], { hour: 'numeric', hour12: true }));

    // Prepare Icon Images
    const sunriseIcon = new Image(24, 24);
    sunriseIcon.src = 'icons/sunrise.svg';
    const sunsetIcon = new Image(24, 24);
    sunsetIcon.src = 'icons/sunset.svg';

    const timeDataMs = timeData.map(t => new Date(t).getTime());
    const sunriseMs = new Date(sunrise).getTime();
    const sunsetMs = new Date(sunset).getTime();

    const findClosestIndex = (times, targetTime) => {
        return times.reduce((prev, curr, index) => {
            const prevDiff = Math.abs(targetTime - times[prev]);
            const currDiff = Math.abs(targetTime - curr);
            return currDiff < prevDiff ? index : prev;
        }, 0);
    };

    const sunriseIndex = findClosestIndex(timeDataMs, sunriseMs);
    const sunsetIndex = findClosestIndex(timeDataMs, sunsetMs);

    const getCommonOptions = (title) => ({
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index',
            intersect: false,
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                enabled: true,
            },
        },
        scales: {
            x: {
                ticks: { color: 'rgba(255, 255, 255, 0.8)' },
                grid: { color: 'rgba(255, 255, 255, 0.1)' }
            },
            y: {
                ticks: { color: 'rgba(255, 255, 255, 0.8)' },
                grid: { color: 'rgba(255, 255, 255, 0.1)' },
                title: {
                    display: true,
                    text: title,
                    color: 'rgba(255, 255, 255, 0.8)'
                }
            }
        },
    });

    const getAnnotationOptions = (data, icon, index) => ({
        type: 'point',
        xValue: index,
        yValue: data[index],
        pointStyle: icon,
    });

    const syncCharts = (hoveredChart, index) => {
        const charts = [windChart, precipitationChart, temperatureChart, tideChart].filter(Boolean);
        charts.forEach(chart => {
            if (chart !== hoveredChart) {
                const tooltip = chart.tooltip;
                if (tooltip) {
                    const activeElements = tooltip.getActiveElements();
                    if (activeElements.length === 0 || activeElements[0].index !== index) {
                        tooltip.setActiveElements([{ datasetIndex: 0, index: index }], {x:0, y:0});
                        chart.update();
                    }
                }
            }
        });
    };

    const clearSync = () => {
        const charts = [windChart, precipitationChart, temperatureChart, tideChart].filter(Boolean);
        setTimeout(() => {
            const anyActive = charts.some(c => c.tooltip && c.tooltip.getActiveElements().length > 0);
            if (!anyActive) {
                charts.forEach(c => {
                    if (c.tooltip) {
                        c.tooltip.setActiveElements([], {x:0, y:0});
                        c.update();
                    }
                });
            }
        }, 100);
    };

    const baseOnHover = (event, chartElement, chart) => {
        if (chartElement.length > 0) {
            syncCharts(chart, chartElement[0].index);
        } else {
            clearSync();
        }
    };

    // Wind Chart
    const windOptions = getCommonOptions('Wind Speed (mph)');
    windOptions.onHover = baseOnHover;
    windOptions.plugins.annotation = { annotations: { sunrise: getAnnotationOptions(windData, sunriseIcon, sunriseIndex), sunset: getAnnotationOptions(windData, sunsetIcon, sunsetIndex) }};
    const windCtx = document.getElementById('wind-chart').getContext('2d');
    windChart = new Chart(windCtx, { type: 'line', data: { labels, datasets: [{ label: 'Wind Speed', data: windData, borderColor: 'rgba(255, 99, 132, 0.8)', backgroundColor: 'rgba(255, 99, 132, 0.2)', fill: true, tension: 0.4 }] }, options: windOptions });

    // Precipitation Chart
    const precipOptions = getCommonOptions('Precipitation (%)');
    precipOptions.scales.y.min = 0;
    precipOptions.scales.y.max = 100;
    precipOptions.onHover = baseOnHover;
    precipOptions.plugins.annotation = { annotations: { sunrise: getAnnotationOptions(precipitationData, sunriseIcon, sunriseIndex), sunset: getAnnotationOptions(precipitationData, sunsetIcon, sunsetIndex) }};
    const precipitationCtx = document.getElementById('precipitation-chart').getContext('2d');
    precipitationChart = new Chart(precipitationCtx, { type: 'line', data: { labels, datasets: [{ label: 'Precipitation', data: precipitationData, borderColor: 'rgba(54, 162, 235, 0.8)', backgroundColor: 'rgba(54, 162, 235, 0.2)', fill: true, tension: 0.4 }] }, options: precipOptions });

    // Temperature Chart
    const tempOptions = getCommonOptions('Temperature (°F)');
    tempOptions.onHover = baseOnHover;
    tempOptions.plugins.annotation = { annotations: { sunrise: getAnnotationOptions(temperatureData, sunriseIcon, sunriseIndex), sunset: getAnnotationOptions(temperatureData, sunsetIcon, sunsetIndex) }};
    const temperatureCtx = document.getElementById('temperature-chart').getContext('2d');
    temperatureChart = new Chart(temperatureCtx, { type: 'line', data: { labels, datasets: [{ label: 'Temperature', data: temperatureData, borderColor: 'rgba(255, 206, 86, 0.8)', backgroundColor: 'rgba(255, 206, 86, 0.2)', fill: true, tension: 0.4 }] }, options: tempOptions });

    // Wave Chart
    const waveChartElement = document.getElementById('wave-chart');
    if (waveData && waveData.some(w => w !== null && !isNaN(w))) {
        waveChartElement.parentElement.style.display = 'block';
        const waveOptions = getCommonOptions('Wave Height (ft)');
        waveOptions.onHover = baseOnHover;
        waveOptions.plugins.annotation = { annotations: { sunrise: getAnnotationOptions(waveData, sunriseIcon, sunriseIndex), sunset: getAnnotationOptions(waveData, sunsetIcon, sunsetIndex) }};
        const waveCtx = waveChartElement.getContext('2d');
        waveChart = new Chart(waveCtx, { type: 'line', data: { labels, datasets: [{ label: 'Wave Height', data: waveData, borderColor: 'rgba(75, 192, 192, 0.8)', backgroundColor: 'rgba(75, 192, 192, 0.2)', fill: true, tension: 0.4 }] }, options: waveOptions });
    } else {
        if (waveChartElement) {
            waveChartElement.parentElement.style.display = 'none';
        }
        waveChart = null;
    }

    // Tide Chart
    const tideChartElement = document.getElementById('tide-chart');
    const tideDisclaimer = document.querySelector('.tide-disclaimer');
    if (tideData && tideData.length > 0) {
        tideChartElement.parentElement.style.display = 'block';
        tideDisclaimer.style.display = 'block';

        // Align tide data with the hourly forecast labels
        const alignedTideData = labels.map(label => {
            const labelDate = new Date(`${timeData[0].toDateString()} ${label}`);

            let closestTide = null;
            let minDiff = Infinity;

            tideData.forEach(tidePoint => {
                const tideDate = new Date(tidePoint.t);
                const diff = Math.abs(labelDate - tideDate);
                if (diff < minDiff) {
                    minDiff = diff;
                    closestTide = parseFloat(tidePoint.v);
                }
            });
            return closestTide;
        });

        const tideOptions = getCommonOptions('Tide (ft MLLW)');
        tideOptions.onHover = baseOnHover;
        tideOptions.plugins.annotation = { annotations: { sunrise: getAnnotationOptions(alignedTideData, sunriseIcon, sunriseIndex), sunset: getAnnotationOptions(alignedTideData, sunsetIcon, sunsetIndex) }};
        const tideCtx = tideChartElement.getContext('2d');
        tideChart = new Chart(tideCtx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Tide',
                    data: alignedTideData,
                    borderColor: 'rgba(153, 102, 255, 0.8)',
                    backgroundColor: 'rgba(153, 102, 255, 0.2)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: tideOptions
        });
    } else {
        if (tideChartElement) {
            tideChartElement.parentElement.style.display = 'none';
        }
        if (tideDisclaimer) {
            tideDisclaimer.style.display = 'none';
        }
        tideChart = null;
    }
}


function mapNwsIconToAppIcon(iconUrl) {
    const mapping = {
        "skc": "sun",
        "few": "cloudy",
        "sct": "cloudy",
        "bkn": "cloudy",
        "ovc": "cloudy",
        "wind_skc": "sun",
        "wind_few": "cloudy",
        "wind_sct": "cloudy",
        "wind_bkn": "cloudy",
        "wind_ovc": "cloudy",
        "snow": "snow",
        "rain_snow": "rain",
        "rain_sleet": "rain",
        "snow_sleet": "snow",
        "fzra": "rain",
        "rain_fzra": "rain",
        "snow_fzra": "snow",
        "sleet": "rain",
        "rain": "rain",
        "rain_showers": "showers",
        "rain_showers_hi": "showers",
        "tsra": "thunderstorm",
        "tsra_sct": "thunderstorm",
        "tsra_hi": "thunderstorm",
        "tornado": "thunderstorm",
        "hurricane": "thunderstorm",
        "tropical_storm": "thunderstorm",
        "dust": "fog",
        "smoke": "fog",
        "haze": "fog",
        "hot": "sun",
        "cold": "sun",
        "blizzard": "snow",
        "fog": "fog"
    };

    const key = Object.keys(mapping).find(key => iconUrl.includes(key));
    return `icons/${mapping[key] || 'cloudy'}.svg`;
}

function isGoodBoatingDayNWS(periods) {
    const maxWind = userThresholds.maxWind * 1.151; // Convert knots to mph
    const maxPrecip = userThresholds.maxPrecip;
    const minTemp = userThresholds.minTemp;
    const maxTemp = userThresholds.maxTemp;

    const results = {
        morning: { isGood: true, reason: 'clear' },
        afternoon: { isGood: true, reason: 'clear' }
    };

    periods.forEach(period => {
        const hour = new Date(period.startTime).getHours();
        const windSpeedMatch = period.windSpeed.match(/(\d+)/);
        const wind = windSpeedMatch ? parseInt(windSpeedMatch[0], 10) : 0;
        const precip = period.probabilityOfPrecipitation.value || 0;
        const temp = period.temperature;

        let reason = 'clear';
        if (wind > maxWind) reason = 'wind';
        else if (precip > maxPrecip) reason = 'precip';
        else if (temp < minTemp || temp > maxTemp) reason = 'temp';

        const isBadWeather = reason !== 'clear';

        if (hour >= 8 && hour < 15) { // Morning
            if (isBadWeather && results.morning.isGood) {
                results.morning = { isGood: false, reason: reason };
            }
        }
        if (hour >= 15 && hour < 20) { // Afternoon
            if (isBadWeather && results.afternoon.isGood) {
                results.afternoon = { isGood: false, reason: reason };
            }
        }
    });

    return results;
}

function getWeatherIcon(code) {
    if (code === 0) return 'icons/sun.svg';
    if (code >= 1 && code <= 3) return 'icons/cloudy.svg';
    if (code === 45 || code === 48) return 'icons/fog.svg';
    if (code >= 51 && code <= 67) return 'icons/rain.svg';
    if (code >= 71 && code <= 77) return 'icons/snow.svg';
    if (code >= 80 && code <= 86) return 'icons/showers.svg';
    if (code >= 95 && code <= 99) return 'icons/thunderstorm.svg';
    return 'icons/cloudy.svg';
}

function displayRadarMap(lat, lon) {
    const radarContainer = document.getElementById('radar-map-container');
    radarContainer.innerHTML = ''; // Clear previous map
    radarContainer.style.height = '400px';

    if (radarMap) {
        radarMap.remove();
    }

    radarMap = L.map('radar-map-container').setView([lat, lon], 10);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(radarMap);

    const nwsWmsUrl = 'https://opengeo.ncep.noaa.gov/geoserver/MRMS/wms';
    const isoTime = new Date().toISOString();
    L.tileLayer.wms(nwsWmsUrl, {
        layers: 'CREF',
        format: 'image/png',
        transparent: true,
        opacity: 0.8,
        time: isoTime,
        attribution: 'NWS'
    }).addTo(radarMap);
}

let userThresholds = {
    maxWind: 12, // knots
    maxPrecip: 25,
    minTemp: 60,
    maxTemp: 90,
};

function isGoodBoatingDay(hourly, dayIndex) {
    const maxWind = userThresholds.maxWind * 1.151; // Convert knots to mph
    const maxPrecip = userThresholds.maxPrecip;
    const minTemp = userThresholds.minTemp;
    const maxTemp = userThresholds.maxTemp;

    const startIndex = dayIndex * 24;
    const endIndex = startIndex + 24;

    const results = {
        morning: { isGood: true, reason: 'clear' },
        afternoon: { isGood: true, reason: 'clear' }
    };

    for (let i = startIndex; i < endIndex && i < hourly.time.length; i++) {
        const hour = new Date(hourly.time[i]).getHours();
        const wind = hourly.wind_speed_10m[i];
        const precip = hourly.precipitation_probability[i];
        const temp = hourly.temperature_2m[i];

        let reason = 'clear';
        if (wind > maxWind) reason = 'wind';
        else if (precip > maxPrecip) reason = 'precip';
        else if (temp < minTemp || temp > maxTemp) reason = 'temp';

        const isBadWeather = reason !== 'clear';

        if (hour >= 8 && hour < 15) { // Morning
            if (isBadWeather && results.morning.isGood) {
                results.morning = { isGood: false, reason: reason };
            }
        }
        if (hour >= 15 && hour < 20) { // Afternoon
            if (isBadWeather && results.afternoon.isGood) {
                results.afternoon = { isGood: false, reason: reason };
            }
        }
    }

    return results;
}

function getReasonIcon(reason) {
    switch (reason) {
        case 'wind':
            return 'wi-strong-wind';
        case 'precip':
            return 'wi-raindrop';
        case 'temp':
            return 'wi-thermometer';
        default:
            return 'wi-day-sunny';
    }
}

function getWeatherDescription(code) {
    const descriptions = {
        0: 'Clear sky',
        1: 'Mainly clear, partly cloudy, and overcast',
        2: 'Partly cloudy',
        3: 'Overcast',
        45: 'Fog and depositing rime fog',
        48: 'Fog and depositing rime fog',
        51: 'Drizzle: Light, moderate, and dense intensity',
        53: 'Drizzle: Light, moderate, and dense intensity',
        55: 'Drizzle: Light, moderate, and dense intensity',
        56: 'Freezing Drizzle: Light and dense intensity',
        57: 'Freezing Drizzle: Light and dense intensity',
        61: 'Rain: Slight, moderate and heavy intensity',
        63: 'Rain: Slight, moderate and heavy intensity',
        65: 'Rain: Slight, moderate and heavy intensity',
        66: 'Freezing Rain: Light and heavy intensity',
        67: 'Freezing Rain: Light and heavy intensity',
        71: 'Snow fall: Slight, moderate, and heavy intensity',
        73: 'Snow fall: Slight, moderate, and heavy intensity',
        75: 'Snow fall: Slight, moderate, and heavy intensity',
        77: 'Snow grains',
        80: 'Rain showers: Slight, moderate, and violent',
        81: 'Rain showers: Slight, moderate, and violent',
        82: 'Rain showers: Slight, moderate, and violent',
        85: 'Snow showers slight and heavy',
        86: 'Snow showers slight and heavy',
        95: 'Thunderstorm: Slight or moderate',
        96: 'Thunderstorm with slight and heavy hail',
        99: 'Thunderstorm with slight and heavy hail',
    };
    return descriptions[code] || 'No description available.';
}