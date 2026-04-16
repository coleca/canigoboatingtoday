// tests/app.spec.js
import { test, expect } from '@playwright/test'

test.describe('Can I go boating today? App - E2E', () => {
  test('should load and display a complete weather forecast', async ({ page }) => {
    const mockPointsData = {
      properties: {
        forecast: 'https://api.weather.gov/gridpoints/LOX/154,44/forecast',
        forecastGridData: 'https://api.weather.gov/gridpoints/LOX/154,44',
      },
    }

    const mockForecastData = {
      properties: {
        periods: [
          {
            name: 'Thursday',
            isDaytime: true,
            temperature: 72,
            temperatureUnit: 'F',
            shortForecast: 'Sunny',
            detailedForecast: 'Sunny, with seas around 2 feet.',
            startTime: '2026-04-16T09:00:00-07:00',
            icon: 'https://api.weather.gov/icons/land/day/few?size=medium',
          },
          {
            name: 'Tonight',
            isDaytime: false,
            temperature: 60,
            temperatureUnit: 'F',
            shortForecast: 'Mostly clear',
            detailedForecast: 'Mostly clear, with seas around 1 foot.',
            startTime: '2026-04-16T18:00:00-07:00',
            icon: 'https://api.weather.gov/icons/land/night/few?size=medium',
          },
        ],
      },
    }

    const mockGridData = {
      properties: {
        temperature: { values: [] },
        windSpeed: { values: [] },
        probabilityOfPrecipitation: { values: [] },
        waveHeight: { values: [] },
      },
    }

    const mockStations = {
      stations: [{ id: '9410660', lat: 34.05, lng: -118.24, name: 'Los Angeles' }],
    }

    const mockTidePredictions = {
      predictions: [
        { t: '2026-04-16 00:00', v: '1.1' },
        { t: '2026-04-16 06:00', v: '3.4' },
        { t: '2026-04-16 12:00', v: '0.8' },
        { t: '2026-04-16 18:00', v: '2.9' },
      ],
    }

    await page.route('https://api.weather.gov/points/**', async (route) => {
      await route.fulfill({ json: mockPointsData })
    })

    await page.route('https://api.weather.gov/gridpoints/LOX/154,44/forecast', async (route) => {
      await route.fulfill({ json: mockForecastData })
    })

    await page.route('https://api.weather.gov/gridpoints/LOX/154,44', async (route) => {
      await route.fulfill({ json: mockGridData })
    })

    await page.route('https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json?type=tidepredictions', async (route) => {
      await route.fulfill({ json: mockStations })
    })

    await page.route('https://api.tidesandcurrents.noaa.gov/api/prod/datagetter**', async (route) => {
      await route.fulfill({ json: mockTidePredictions })
    })

    // Navigate to the home page
    await page.goto('/')

    // Wait for the main heading to be visible, indicating the app has loaded
    await expect(page.locator('h1')).toHaveText('Can I go boating today?')

    // 1. Verify Location Display
    // Check that the latitude and longitude are displayed, confirming geolocation worked.
    await expect(page.getByText(/Latitude: 34.0522/)).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(/Longitude: -118.2437/)).toBeVisible()

    // 2. Verify Day Forecasts
    await expect(page.getByRole('heading', { name: 'Thu', exact: true })).toBeVisible()

    // 3. Verify Wave Forecast
    // Check that the wave forecast component has rendered and displays some value (even "N/A").
    await expect(page.getByRole('heading', { name: 'Wave Forecast' })).toBeVisible()
    await expect(page.getByText(/Current Wave Height:/)).toBeVisible()

    // 4. Verify Tide Chart
    // The chart is rendered in a canvas. We'll check that its title is visible.
    await expect(page.locator("canvas")).toBeVisible()

    // 5. Verify Radar Map
    // Check for the "Weather Radar" heading and that the map container is present.
    await expect(page.getByRole('heading', { name: 'Weather Radar' })).toBeVisible()
    // The map itself is in a specific container, let's check for the attribution text as a sign it's loaded.
    await expect(page.getByText(/OpenStreetMap/)).toBeVisible()
  })
})
