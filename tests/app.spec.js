// tests/app.spec.js
import { test, expect } from '@playwright/test'

test.describe('Boating Forecast App - E2E', () => {
  test('should load and display a complete weather forecast', async ({ page }) => {
    await page.route('**/api/forecast**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          forecast: {
            periods: [
              {
                number: 1,
                name: 'Today',
                isDaytime: true,
                temperature: 72,
                temperatureUnit: 'F',
                windSpeed: '10 mph',
                shortForecast: 'Sunny',
                detailedForecast: 'Sunny skies.',
                probabilityOfPrecipitation: { value: 10 },
              },
              {
                number: 2,
                name: 'Tonight',
                isDaytime: false,
                temperature: 58,
                temperatureUnit: 'F',
                windSpeed: '6 mph',
                shortForecast: 'Clear',
                detailedForecast: 'Clear overnight.',
                probabilityOfPrecipitation: { value: 0 },
              },
            ],
          },
          hourly: {
            periods: [
              {
                number: 1,
                startTime: '2026-03-21T10:00:00-04:00',
                temperature: 71,
                temperatureUnit: 'F',
                windSpeed: '9 mph',
                shortForecast: 'Sunny',
              },
            ],
          },
          alerts: [],
          meta: { city: 'Los Angeles', state: 'CA' },
        }),
      })
    })

    await page.route('**/api/tides**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          predictions: [{ t: '2026-03-21 12:00', v: '3.5' }],
          station: { id: '2', name: 'Closest Station' },
        }),
      })
    })

    // Navigate to the home page
    await page.goto('/')

    // Wait for the main heading to be visible, indicating the app has loaded
    await expect(page.locator('h1')).toHaveText('Can I go boating today?')

    // 1. Verify Location Display
    // Check that the latitude and longitude are displayed, confirming geolocation worked.
    await expect(page.getByText(/Latitude: 34.0522/)).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(/Longitude: -118.2437/)).toBeVisible()

    await expect(page.getByText('Los Angeles, CA')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Pick a day to inspect conditions' })).toBeVisible()
    await expect(page.getByText('Sunny skies.')).toBeVisible()

    await expect(page.getByRole('heading', { name: 'Wave Forecast' })).toBeVisible()
    await expect(page.getByText(/Current Wave Height:/)).toBeVisible()

    await expect(page.getByText("Today's Tide Predictions")).toBeVisible()

    await expect(page.getByRole('heading', { name: 'Weather Radar' })).toBeVisible()
    await expect(page.getByText(/OpenStreetMap/)).toBeVisible()
  })
})
