let tideChart;

document.addEventListener('DOMContentLoaded', () => {
    const locationForm = document.getElementById('location-form');
    locationForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const locationInput = document.getElementById('location-input');
        geocodeAndGetWeather(locationInput.value);
    });

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            getWeather(lat, lon, "Current Location");
        }, error => {
            console.error("Error getting location: ", error);
            geocodeAndGetWeather("New York");
        });
    } else {
        console.error("Geolocation is not supported by this browser.");
        geocodeAndGetWeather("New York");
    }
});

function geocodeAndGetWeather(locationName) {
    const geocodeApiUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${locationName}&count=1&language=en&format=json`;

    fetch(geocodeApiUrl)
        .then(response => response.json())
        .then(data => {
            if (data.results && data.results.length > 0) {
                const location = data.results[0];
                getWeather(location.latitude, location.longitude, location.name);
            } else {
                alert("Could not find location. Please try again.");
            }
        })
        .catch(error => {
            console.error('Error fetching geocoding data:', error);
            alert("An error occurred while fetching the location. Please try again.");
        });
}

function getWeather(lat, lon, locationName) {
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
        displayWeather(combinedData, locationName);
    })
    .catch(error => {
        console.error('Error fetching weather data:', error);
    });
}

function displayWeather(data, locationName) {
    const currentLocationElement = document.getElementById('current-location');
    currentLocationElement.textContent = `Weather for: ${locationName}`;

    const forecastContainer = document.getElementById('weather-forecast');
    forecastContainer.innerHTML = '';

    displayRadarMap(data.latitude, data.longitude);

    const daily = data.daily;
    const hourly = data.hourly;

    for (let i = 0; i < daily.time.length; i++) {
        const dayDiv = document.createElement('div');
        dayDiv.classList.add('day-forecast');
        dayDiv.addEventListener('click', () => displayHourlyForecast(i, data));

        // By appending 'T00:00', we ensure the date is parsed in the local timezone, preventing day-of-the-week errors.
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

        forecastContainer.appendChild(dayDiv);
    }

    // Automatically display the hourly forecast for the current day (index 0)
    displayHourlyForecast(0, data);
}

function displayHourlyForecast(dayIndex, data) {
    // Highlight the selected day
    const allDays = document.querySelectorAll('.day-forecast');
    allDays.forEach(day => day.classList.remove('selected'));
    allDays[dayIndex].classList.add('selected');

    const hourlyContainer = document.getElementById('hourly-forecast-container');
    const hourlyDetails = document.getElementById('hourly-forecast-details');
    const hourlyDay = document.getElementById('hourly-forecast-day');

    hourlyDetails.innerHTML = '';

    // Remove existing weather description if it exists
    const existingDescription = hourlyContainer.querySelector('.weather-description');
    if (existingDescription) {
        existingDescription.remove();
    }

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

    const weatherDescriptionElement = document.createElement('p');
    weatherDescriptionElement.classList.add('weather-description');
    weatherDescriptionElement.textContent = getWeatherDescription(data.daily.weather_code[dayIndex]);
    hourlyContainer.appendChild(weatherDescriptionElement);

    const tideChartContainer = document.getElementById('tide-chart-container');
    if (data.marine && data.marine.hourly && data.marine.hourly.sea_level_height_msl) {
        const hourlyTideData = data.marine.hourly.sea_level_height_msl.slice(startIndex, endIndex);
        const hourlyTimeData = data.hourly.time.slice(startIndex, endIndex);
        const hasTideData = hourlyTideData.some(tide => tide !== null && !isNaN(tide));

        if (hasTideData) {
            tideChartContainer.style.display = 'block';
            displayTideChart(hourlyTimeData, hourlyTideData);
        } else {
            tideChartContainer.style.display = 'none';
        }
    } else {
        tideChartContainer.style.display = 'none';
    }
}

function displayTideChart(timeData, tideData) {
    const ctx = document.getElementById('tide-chart').getContext('2d');
    if (tideChart) {
        tideChart.destroy();
    }
    tideChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: timeData.map(t => new Date(t).toLocaleTimeString([], { hour: 'numeric', hour12: true })),
            datasets: [{
                label: 'Tide Height (ft)',
                data: tideData,
                borderColor: 'rgba(255, 255, 255, 0.8)',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                fill: true,
                tension: 0.4,
                pointRadius: 2,
                pointBackgroundColor: 'rgba(255, 255, 255, 0.8)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += context.parsed.y.toFixed(2) + ' ft';
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.8)'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: 'Tide Height (ft)',
                        color: 'rgba(255, 255, 255, 0.8)'
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.8)'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            }
        }
    });
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
    radarContainer.innerHTML = '';

    const iframe = document.createElement('iframe');
    iframe.src = `https://www.meteoblue.com/en/weather/maps/widget/?windAnimation=0&gust=0&satellite=0&clouds_precipitation=1&temperature=0&sunshine=0&extreme=0&geoloc=fixed&lat=${lat}&lon=${lon}&zoom=8&autowidth=auto`;
    iframe.style.width = '100%';
    iframe.style.height = '400px';
    iframe.style.border = 'none';
    radarContainer.appendChild(iframe);
}

function isGoodBoatingDay(hourly, dayIndex) {
    const maxWind = 12 * 1.151; // 12 knots in mph
    const maxPrecip = 25; // %
    const minTemp = 60; // F
    const maxTemp = 90; // F

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