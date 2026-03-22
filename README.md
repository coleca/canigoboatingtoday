# Can I Go Boating Today?

A U.S.-focused boating forecast Progressive Web App built with Next.js. The app uses server-side proxy routes for National Weather Service forecast data, NOAA tide predictions, and U.S. Census geocoding so live forecast loading works reliably on Vercel.

## What It Does

- Uses the browser's current location when available.
- Falls back to manual U.S. location search when geolocation is unavailable or denied.
- Displays a seven-day boating outlook, selected-day details, hourly outlook, NOAA tide predictions, alerts, and a live radar map.
- Works as a PWA with a manifest and generated service worker files under `public/`.
- Caches the NOAA tide-station metadata list in `localStorage` to reduce repeated downloads.

## Project Structure

- [app/page.js](./app/page.js): top-level route that renders the dashboard shell.
- [components/WeatherDashboard.js](./components/WeatherDashboard.js): main client component for location selection, loading state, and orchestration.
- [components/TideChart.js](./components/TideChart.js): Chart.js wrapper for tide predictions.
- [components/WaveForecast.js](./components/WaveForecast.js): parses and displays wave height text from the NWS forecast.
- [components/RadarMap.js](./components/RadarMap.js): Leaflet map with NOAA radar WMS overlay.
- [app/api/forecast/route.js](./app/api/forecast/route.js): server route that proxies NWS forecast and alert data.
- [app/api/location/route.js](./app/api/location/route.js): server route that proxies U.S. Census geocoding.
- [app/api/tides/route.js](./app/api/tides/route.js): server route that proxies NOAA tide metadata and predictions.
- [lib/weatherService.js](./lib/weatherService.js): client helpers that call the internal app routes.
- [ARCHITECTURE.md](./ARCHITECTURE.md): system-level architecture and data-flow notes.

## Local Development

### Prerequisites

- Node.js `24.x`
- npm `11.11.0` or newer
- `nvm` recommended

### Use the Pinned Node Version

This repo includes an [.nvmrc](./.nvmrc) file pinned to Node `24`.

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

- This app is now intended for Vercel or another server-capable Next.js host. GitHub Pages is no longer the production target.
- Tide data is treated as optional. If no nearby tide station is found, the rest of the dashboard still loads.
- See [DEPLOYMENT.md](./DEPLOYMENT.md) for the Vercel deployment path and [ARCHITECTURE.md](./ARCHITECTURE.md) for data-flow notes.
