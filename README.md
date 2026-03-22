# Can I Go Boating Today?

A U.S.-focused boating forecast Progressive Web App built with Next.js. The app uses National Weather Service forecast data, NOAA tide predictions, and a NOAA radar overlay to help boaters quickly review local conditions.

## What It Does

- Uses the browser's current location when available.
- Falls back to manual U.S. location search when geolocation is unavailable or denied.
- Displays the current NWS forecast summary, wave text extracted from the forecast, NOAA tide predictions, and a live radar map.
- Works as a PWA with a manifest and generated service worker files under `public/`.
- Caches the NOAA tide-station metadata list in `localStorage` to reduce repeated downloads.

## Project Structure

- [app/page.js](./app/page.js): top-level route that renders the dashboard shell.
- [components/WeatherDashboard.js](./components/WeatherDashboard.js): main client component for location selection, loading state, and orchestration.
- [components/TideChart.js](./components/TideChart.js): Chart.js wrapper for tide predictions.
- [components/WaveForecast.js](./components/WaveForecast.js): parses and displays wave height text from the NWS forecast.
- [components/RadarMap.js](./components/RadarMap.js): Leaflet map with NOAA radar WMS overlay.
- [lib/weatherService.js](./lib/weatherService.js): client-side API calls for NWS forecast, NOAA tides, and U.S. location search.
- [ARCHITECTURE.md](./ARCHITECTURE.md): system-level architecture and data-flow notes.

## Local Development

### Prerequisites

- Node.js `25.8.1`
- npm `11.11.0` or newer
- `nvm` recommended

### Use the Pinned Node Version

This repo includes an [.nvmrc](./.nvmrc) file pinned to Node `25.8.1`.

If you use `nvm`, run:

```bash
nvm install
nvm use
```

### Install Dependencies

```bash
npm install
```

That command installs both runtime and test dependencies from `package.json`, including:

- `jest` and `@testing-library/*` for unit/component tests
- `@playwright/test` for end-to-end tests

### Install Playwright Browsers

Playwright also needs browser binaries the first time you set it up:

```bash
npx playwright install
```

If your machine is missing OS-level browser dependencies, Playwright will tell you what to install. On CI or a brand-new machine, you can also use:

```bash
npx playwright install --with-deps
```

### Run the App

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Testing

### Unit and Component Tests

```bash
npm test -- --runInBand
```

If you see `jest: command not found`, dependencies have not been installed yet. Run `npm install` first.

### End-to-End Tests

```bash
npm run test:e2e
```

If Playwright reports that browsers are missing, run:

```bash
npx playwright install
```

## Notes

- NOAA and NWS APIs are called directly from the browser, so the app needs network access for live forecast data.
- Tide data is treated as optional. If no nearby tide station is found, the rest of the dashboard still loads.
- The app currently focuses on forecast, tide, wave-text, and radar behavior. See [ARCHITECTURE.md](./ARCHITECTURE.md) for details and future expansion paths.
