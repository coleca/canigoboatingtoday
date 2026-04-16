// tests/app.spec.js
import { test, expect } from '@playwright/test'

test.describe('Can I go boating today? App - E2E', () => {
  test('should load and display a complete weather forecast', async ({ page }) => {
    // Navigate to the home page
    await page.goto('/')

    // Wait for the main heading to be visible, indicating the app has loaded
    await expect(page.locator('h1')).toHaveText('Can I go boating today?')

    // 1. Verify Location Display
    // Check that the latitude and longitude are displayed, confirming geolocation worked.
    await expect(page.getByText(/Latitude: 34.0522/)).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(/Longitude: -118.2437/)).toBeVisible()

    // 2. Verify Day Forecasts
    // Check that an abbreviated day header (e.g., "Thi" for This Afternoon, "Ton" for Tonight, etc.) is visible.
    await expect(page.getByText(/Thi|Ton|Mon|Tue|Wed|Thu|Fri|Sat|Sun/).first()).toBeVisible()

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
