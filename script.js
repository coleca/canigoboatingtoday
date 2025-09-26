document.addEventListener('DOMContentLoaded', () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            getWeather(lat, lon);
        }, error => {
            console.error("Error getting location: ", error);
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

        const date = new Date(daily.time[i]);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

        const dayNameElement = document.createElement('h2');
        dayNameElement.textContent = dayName;

        const weatherIcon = document.createElement('img');
        weatherIcon.src = getWeatherIcon(daily.weather_code[i]);
        weatherIcon.alt = 'Weather icon';

        const tempElement = document.createElement('p');
        tempElement.classList.add('temp');
        tempElement.innerHTML = `<span class="max">${Math.round(daily.temperature_2m_max[i])}°</span> / ${Math.round(daily.temperature_2m_min[i])}°`;

        dayDiv.appendChild(dayNameElement);
        dayDiv.appendChild(weatherIcon);
        dayDiv.appendChild(tempElement);

        forecastContainer.appendChild(dayDiv);
    }
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