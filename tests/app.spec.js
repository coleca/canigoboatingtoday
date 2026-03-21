// tests/app.spec.js
import { test, expect } from '@playwright/test'

test.describe('Boating Forecast App - E2E', () => {
  test('should load and display a complete weather forecast', async ({ page }) => {
    // Navigate to the home page
    await page.goto('/')

    // Wait for the main heading to be visible, indicating the app has loaded
    await expect(page.locator('h1')).toHaveText('Boating Forecast')

    // 1. Verify Location Display
    // Check that the latitude and longitude are displayed, confirming geolocation worked.
    await expect(page.getByText(/Latitude: 34.0522/)).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(/Longitude: -118.2437/)).toBeVisible()

    // 2. Verify Current Conditions
    // Check for the "Current Conditions" heading and that a forecast period (e.g., "Tonight") is visible.
    await expect(page.getByRole('heading', { name: 'Current Conditions' })).toBeVisible()
    await expect(page.getByText(/Tonight|Today|This Afternoon/)).toBeVisible()

    // 3. Verify Wave Forecast
    // Check that the wave forecast component has rendered and displays some value (even "N/A").
    await expect(page.getByRole('heading', { name: 'Wave Forecast' })).toBeVisible()
    await expect(page.getByText(/Current Wave Height:/)).toBeVisible()

    // 4. Verify Tide Chart
    // The chart is rendered in a canvas. We'll check that its title is visible.
    await expect(page.getByText("Today's Tide Predictions")).toBeVisible()

    // 5. Verify Radar Map
    // Check for the "Weather Radar" heading and that the map container is present.
    await expect(page.getByRole('heading', { name: 'Weather Radar' })).toBeVisible()
    // The map itself is in a specific container, let's check for the attribution text as a sign it's loaded.
    await expect(page.getByText(/OpenStreetMap/)).toBeVisible()
  })
})
