# Can I go boating today?

This is a simple web application designed to help users determine if it's a good day to go boating. It provides a comprehensive 8-day weather forecast, an hourly forecast with boating-specific information, and an embedded weather radar map.

## Features

*   **8-Day Weather Forecast**: Displays a detailed 8-day forecast, including a short weather description for each day. On mobile, the forecast scrolls horizontally.
*   **Good Boating Day Indicator**: Quickly see if it's a good day for boating based on wind (under 12 knots), precipitation, and temperature.
*   **Synchronized Hourly Charts**: For a comprehensive hourly view, three interactive line charts display wind speed, precipitation probability, and tide levels. The charts are synchronized, so hovering over one will show a tooltip and crosshair on all three at the same time point.
*   **Embedded Radar Map**: An interactive weather radar map from meteoblue is embedded at the bottom of the page.
*   **Geolocation**: The application automatically detects the user's location to provide a local weather forecast.

## Data Sources

This project utilizes several free data sources to provide a comprehensive weather overview:

*   **Open-Meteo API**: The primary source for weather forecast data, including daily and hourly forecasts, temperature, wind speed, precipitation, and sunrise/sunset times.
*   **meteoblue Weather Maps Widget**: Provides the embedded weather radar map.
*   **weather-icons**: A font and CSS library used for the weather-themed icons in the application.

## Technologies Used

*   **HTML5**: The structure of the web application.
*   **CSS3**: Used for styling the application, including a colorful and friendly "boating" theme with a responsive layout.
*   **JavaScript (ES6+)**: Powers the application's logic, including API calls, data processing, and dynamic content generation.
*   **Chart.js**: Used to create the interactive tide chart.
*   **Playwright**: Used for automated end-to-end testing and verification of the application's features and design.

## How to Use

1.  Clone the repository to your local machine.
2.  Open the `index.html` file in your web browser.
3.  The application will request your location to provide a local forecast. If you deny the request or if geolocation is unavailable, the forecast for New York will be displayed.
4.  Click on any day in the weekly forecast to view the detailed hourly forecast for that day.
5.  Scroll down to view the embedded weather radar map.

## Disclaimer

The weather and tide data provided by this application are for informational purposes only and should not be used for navigation or other critical applications. Always consult official sources for the most accurate and up-to-date information.