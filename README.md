# Can I go boating today?

This is a simple web application designed to help users determine if it's a good day to go boating. It provides a comprehensive 8-day weather forecast, an hourly forecast with boating-specific information, and an embedded weather radar map.

## Features

*   **Severe Weather Alerts**: Displays any active severe weather alerts from the US National Weather Service, color-coded by severity (Warning, Watch, Advisory).
*   **8-Day Weather Forecast**: Displays a detailed 8-day forecast with weather descriptions. On mobile, the forecast uses CSS scroll-snap for a clean, user-friendly horizontal scrolling experience.
*   **Customizable "Good Boating Day" Indicator**: Quickly see if it's a good day for boating. Users can click the settings icon to customize the thresholds for wind, precipitation, and temperature to match their preferences.
*   **Synchronized Hourly Charts**: Four interactive line charts display hourly wind speed, precipitation probability, temperature, and tide levels. The charts are synchronized, and sunrise/sunset are marked with icons directly on each chart's data line.
*   **Human-Readable Location**: When using geolocation, the application uses reverse geocoding to display a user-friendly location name (e.g., "San Francisco, California") instead of just "Current Location."
*   **Loading Indicator**: A loading spinner is displayed while weather data is being fetched to provide better user feedback.
*   **Embedded Radar Map**: An interactive weather radar map from `meteoblue.com` is embedded at the bottom of the page.

## Data Sources

This project utilizes several free data sources to provide a comprehensive weather overview:

*   **Open-Meteo API**: The primary source for the main weather forecast data (temperature, wind, etc.).
*   **US National Weather Service API**: Provides severe weather alerts for US locations.
*   **BigDataCloud API**: Used for free, fast reverse geocoding to convert coordinates into a human-readable location name.
*   **meteoblue Weather Maps Widget**: Provides the embedded weather radar map.
*   **weather-icons**: A font and CSS library used for the weather-themed icons in the application.

## Technologies Used

*   **HTML5**: The structure of the web application.
*   **CSS3**: Used for styling the application, including a colorful and friendly "boating" theme with a responsive layout.
*   **JavaScript (ES6+)**: Powers the application's logic, including API calls, data processing, and dynamic content generation.
*   **Chart.js**: Used to create the interactive tide chart.
*   **chartjs-plugin-annotation**: A plugin for Chart.js used to add the sunrise/sunset icons to the charts.
*   **Playwright**: Used for automated end-to-end testing and verification of the application's features and design.

## How to Use

1.  Clone the repository to your local machine.
2.  Open the `index.html` file in your web browser.
3.  The application will request your location to provide a local forecast. If you deny the request or if geolocation is unavailable, the forecast for New York will be displayed.
4.  Click on any day in the weekly forecast to view the detailed hourly forecast for that day.
5.  Scroll down to view the embedded weather radar map.

## Disclaimer

The weather and tide data provided by this application are for informational purposes only and should not be used for navigation or other critical applications. Always consult official sources for the most accurate and up-to-date information.