const { test, expect } = require('@playwright/test');

test('Tide chart loads without errors', async ({ page, context }) => {
  // Grant geolocation permission and set a specific location
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 40.7128, longitude: -74.0060 }); // New York

  await page.goto('file:///app/index.html');

  // Wait for the loader to disappear
  await page.waitForSelector('#loader-overlay:not(.visible)', { timeout: 90000 });

  // Check that the tide chart is visible
  await expect(page.locator('#tide-chart')).toBeVisible({ timeout: 10000 });
});
