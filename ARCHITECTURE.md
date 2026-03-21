# Architecture

## Overview

`Can I Go Boating Today?` is a client-heavy Next.js application that renders a small static shell and then fetches live marine/weather data directly from public U.S. government APIs in the browser.

The app is optimized for static hosting:

- Next.js App Router provides the UI shell.
- API calls happen client-side from `WeatherDashboard`.
- PWA assets are served from `public/`.
- No custom backend is required.

## Main Runtime Flow

1. The browser loads [app/page.js](./app/page.js), which renders [components/WeatherDashboard.js](./components/WeatherDashboard.js).
2. `WeatherDashboard` tries to get the current GPS location through `navigator.geolocation`.
3. If geolocation fails, the user can search for a U.S. location; that search uses the U.S. Census geocoder via [lib/weatherService.js](./lib/weatherService.js).
4. With coordinates in hand, the dashboard requests:
   - NWS point metadata and forecast
   - NOAA tide-station metadata and tide predictions
5. The page renders:
   - current conditions
   - wave text parsed from the forecast
   - tide chart if data exists
   - radar map centered on the active location

## Modules

### [components/WeatherDashboard.js](./components/WeatherDashboard.js)

Primary orchestration layer.

- owns loading, error, location, forecast, and tide state
- triggers geolocation and manual search
- keeps tide failures non-fatal so forecast/radar still load
- passes normalized data to presentational components

### [lib/weatherService.js](./lib/weatherService.js)

Client-side integration layer for external services.

- `getNWSForecast(latitude, longitude)`
  - calls `api.weather.gov/points/{lat},{lon}`
  - follows the returned forecast URL
- `getTideData(latitude, longitude)`
  - finds the nearest cached NOAA tide station
  - fetches same-day hourly predictions in local station time
  - returns an empty tide payload instead of crashing the page when unavailable
- `searchLocation(query)`
  - uses the U.S. Census geocoder for manual location search

### [components/TideChart.js](./components/TideChart.js)

Chart.js presentation wrapper for tide predictions.

- rounds plotted values to whole numbers
- shows a clear fallback message when tide data is unavailable

### [components/RadarMap.js](./components/RadarMap.js)

Leaflet map with:

- OpenStreetMap base layer
- NOAA radar WMS overlay

This component is loaded client-side only through [components/DynamicRadarMap.js](./components/DynamicRadarMap.js) because Leaflet depends on browser globals.

### [lib/forecastUtils.js](./lib/forecastUtils.js)

Utility parsing helpers for extracting wave-height text from NWS `detailedForecast` strings.

## Data Sources

- NWS forecast API: `https://api.weather.gov`
- NOAA tides and metadata APIs: `https://api.tidesandcurrents.noaa.gov`
- U.S. Census geocoder: `https://geocoding.geo.census.gov`
- NOAA radar WMS: `https://opengeo.ncep.noaa.gov`

## Caching

The large NOAA tide-station list is cached in `localStorage` for seven days. This reduces latency and repeated metadata downloads for returning users.

## Failure Handling

- Geolocation failure is non-fatal: the user can still search manually.
- Tide lookup failure is non-fatal: the tide panel shows an unavailable message while forecast and radar continue working.
- Offline detection happens in the dashboard before live requests start.

## PWA

PWA support is provided through:

- [public/manifest.json](./public/manifest.json)
- generated service worker files in `public/`
- static-export-compatible Next configuration in [next.config.mjs](./next.config.mjs)

## Tradeoffs

- Direct browser API calls keep hosting simple but make the app dependent on third-party API availability and browser CORS behavior.
- Some NOAA/NWS recommendations, such as stronger client identification headers, are harder to satisfy from browser-only fetches than from a server-side proxy.
- Radar and forecast data freshness are determined by upstream services rather than app-controlled caching.

## Good Next Steps

- Add a richer daily/hourly boating score model instead of a single current-conditions summary.
- Persist favorite locations and a dark mode preference.
- Move external API calls to serverless routes if stricter reliability, normalization, or request shaping is needed.
