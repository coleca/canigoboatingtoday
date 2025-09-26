document.addEventListener('DOMContentLoaded', () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            getWeather(lat, lon);
        }, error => {
            console.error("Error getting location: ", error);
            getWeather(40.71, -74.01); // Default to New York
        });
    } else {
        console.error("Geolocation is not supported by this browser.");
        getWeather(40.71, -74.01); // Default to New York
            // Fallback for when geolocation is not available or denied
            // Using a default location (e.g., New York)
            getWeather(40.71, -74.01);
        });
    } else {
        console.error("Geolocation is not supported by this browser.");
        // Fallback for when geolocation is not available
        // Using a default location (e.g., New York)
        getWeather(40.71, -74.01);
    }
});

function getWeather(lat, lon) {
    const forecastApiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset&hourly=precipitation_probability,wind_speed_10m&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto`;
    const marineApiUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&hourly=sea_level_height_msl&timezone=auto`;

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
        displayWeather(combinedData);
    })
    .catch(error => {
        console.error('Error fetching weather data:', error);
    });
    const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;

    fetch(apiUrl)
        .then(response => response.json())
        .then(data => {
            displayWeather(data);
        })
        .catch(error => {
            console.error('Error fetching weather data:', error);
        });
}

function displayWeather(data) {
    const forecastContainer = document.getElementById('weather-forecast');
    forecastContainer.innerHTML = ''; // Clear previous forecast

    const daily = data.daily;

    for (let i = 0; i < daily.time.length; i++) {
        const dayDiv = document.createElement('div');
        dayDiv.classList.add('day-forecast');
        dayDiv.addEventListener('click', () => displayHourlyForecast(i, data));

        const date = new Date(daily.time[i]);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

        const dayNameElement = document.createElement('h2');
        dayNameElement.textContent = dayName;

        const weatherIcon = document.createElement('img');
        weatherIcon.src = getWeatherIcon(daily.weather_code[i]);
        weatherIcon.alt = 'Weather icon';

        const tempElement = document.createElement('p');
        tempElement.classList.add('temp');
        tempElement.innerHTML = `<span class="max">${Math.round(daily.temperature_2m_max[i])}°F</span> / ${Math.round(daily.temperature_2m_min[i])}°F`;

        dayDiv.appendChild(dayNameElement);
        dayDiv.appendChild(weatherIcon);
        dayDiv.appendChild(tempElement);

        forecastContainer.appendChild(dayDiv);
    }
}

function displayHourlyForecast(dayIndex, data) {
    const hourlyContainer = document.getElementById('hourly-forecast-container');
    const hourlyDetails = document.getElementById('hourly-forecast-details');
    const hourlyDay = document.getElementById('hourly-forecast-day');

    hourlyDetails.innerHTML = '';

    const date = new Date(data.daily.time[dayIndex]);
    hourlyDay.textContent = `Hourly Forecast for ${date.toLocaleDateString('en-US', { weekday: 'long' })}`;

    const sunrise = new Date(data.daily.sunrise[dayIndex]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const sunset = new Date(data.daily.sunset[dayIndex]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let sunriseSunsetHtml = `<div class="hourly-item"><div><strong>Sunrise</strong></div><div>${sunrise}</div><br><div><strong>Sunset</strong></div><div>${sunset}</div></div>`;
    hourlyDetails.innerHTML += sunriseSunsetHtml;


    const startIndex = dayIndex * 24;
    const endIndex = startIndex + 24;

    for (let i = startIndex; i < endIndex && i < data.hourly.time.length; i++) {
        const hourlyItem = document.createElement('div');
        hourlyItem.classList.add('hourly-item');

        const time = new Date(data.hourly.time[i]).toLocaleTimeString([], { hour: 'numeric', hour12: true });
        const windSpeed = data.hourly.wind_speed_10m[i];
        const precipitation = data.hourly.precipitation_probability[i];

        let tideHtml = '';
        if (data.marine && data.marine.hourly && data.marine.hourly.sea_level_height_msl) {
            const tide = data.marine.hourly.sea_level_height_msl[i];
            if (tide !== null && !isNaN(tide)) {
                tideHtml = `<div>Tide: ${tide.toFixed(2)}m</div>`;
            }
        }

        hourlyItem.innerHTML = `
            <div class="time">${time}</div>
            <div>Wind: ${Math.round(windSpeed)} mph</div>
            <div>Precip: ${precipitation}%</div>
            ${tideHtml}
        `;
        hourlyDetails.appendChild(hourlyItem);
    }

    hourlyContainer.style.display = 'block';
    document.querySelector('.tide-disclaimer').style.display = (data.marine ? 'block' : 'none');
}

function getWeatherIcon(code) {
    // Mapping based on WMO Weather interpretation codes
    if (code === 0) return 'icons/sun.svg'; // Clear sky
    if (code >= 1 && code <= 3) return 'icons/cloudy.svg'; // Mainly clear, partly cloudy, and overcast
    if (code === 45 || code === 48) return 'icons/fog.svg'; // Fog
    if (code >= 51 && code <= 67) return 'icons/rain.svg'; // Drizzle, Rain
    if (code >= 71 && code <= 77) return 'icons/snow.svg'; // Snow
    if (code >= 80 && code <= 86) return 'icons/showers.svg'; // Showers
    if (code >= 95 && code <= 99) return 'icons/thunderstorm.svg'; // Thunderstorm
    return 'icons/cloudy.svg'; // Default
}