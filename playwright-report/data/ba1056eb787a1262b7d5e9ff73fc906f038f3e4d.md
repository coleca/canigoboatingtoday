# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: app.spec.js >> Can I go boating today? App - E2E >> should load and display a complete weather forecast
- Location: tests/app.spec.js:5:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Current Conditions' })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('heading', { name: 'Current Conditions' })

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main [ref=e2]:
    - generic [ref=e3]:
      - generic [ref=e4]:
        - img [ref=e5]
        - heading "Can I go boating today?" [level=1] [ref=e9]
        - img [ref=e10] [cursor=pointer]
      - generic [ref=e12]:
        - generic [ref=e13]:
          - textbox "Enter a location" [ref=e14]
          - button "Get Weather" [ref=e15] [cursor=pointer]
        - paragraph [ref=e16]: "Latitude: 34.0522, Longitude: -118.2437"
      - generic [ref=e17]:
        - generic [ref=e18] [cursor=pointer]:
          - generic [ref=e19]:
            - heading "Tod" [level=2] [ref=e20]
            - img "Mostly Sunny" [ref=e21]
            - generic [ref=e23]: 73°F
          - generic [ref=e24]:
            - generic [ref=e25]:
              - generic [ref=e26]:
                - img "Sunrise" [ref=e27]
                - generic [ref=e28]: 6:00 AM
              - generic [ref=e29]:
                - img "Sunset" [ref=e30]
                - generic [ref=e31]: 8:00 PM
            - generic [ref=e32]:
              - generic [ref=e33]:
                - text: "MORN: YES"
                - img [ref=e34]
              - generic [ref=e35]:
                - text: "AFT: YES"
                - img [ref=e36]
            - generic [ref=e37]: Mostly Sunny
        - generic [ref=e38] [cursor=pointer]:
          - generic [ref=e39]:
            - heading "Ton" [level=2] [ref=e40]
            - img "Mostly Cloudy" [ref=e41]
            - generic [ref=e43]: 54°F
          - generic [ref=e44]:
            - generic [ref=e45]:
              - generic [ref=e46]:
                - img "Sunrise" [ref=e47]
                - generic [ref=e48]: 6:00 AM
              - generic [ref=e49]:
                - img "Sunset" [ref=e50]
                - generic [ref=e51]: 8:00 PM
            - generic [ref=e52]:
              - generic [ref=e53]:
                - text: "MORN: YES"
                - img [ref=e54]
              - generic [ref=e55]:
                - text: "AFT: YES"
                - img [ref=e56]
            - generic [ref=e57]: Mostly Cloudy
        - generic [ref=e58] [cursor=pointer]:
          - generic [ref=e59]:
            - heading "Thu" [level=2] [ref=e60]
            - img "Partly Sunny" [ref=e61]
            - generic [ref=e63]: 74°F
          - generic [ref=e64]:
            - generic [ref=e65]:
              - generic [ref=e66]:
                - img "Sunrise" [ref=e67]
                - generic [ref=e68]: 6:00 AM
              - generic [ref=e69]:
                - img "Sunset" [ref=e70]
                - generic [ref=e71]: 8:00 PM
            - generic [ref=e72]:
              - generic [ref=e73]:
                - text: "MORN: YES"
                - img [ref=e74]
              - generic [ref=e75]:
                - text: "AFT: YES"
                - img [ref=e76]
            - generic [ref=e77]: Partly Sunny
        - generic [ref=e78] [cursor=pointer]:
          - generic [ref=e79]:
            - heading "Fri" [level=2] [ref=e80]
            - img "Sunny" [ref=e81]
            - generic [ref=e83]: 77°F
          - generic [ref=e84]:
            - generic [ref=e85]:
              - generic [ref=e86]:
                - img "Sunrise" [ref=e87]
                - generic [ref=e88]: 6:00 AM
              - generic [ref=e89]:
                - img "Sunset" [ref=e90]
                - generic [ref=e91]: 8:00 PM
            - generic [ref=e92]:
              - generic [ref=e93]:
                - text: "MORN: YES"
                - img [ref=e94]
              - generic [ref=e95]:
                - text: "AFT: YES"
                - img [ref=e96]
            - generic [ref=e97]: Sunny
        - generic [ref=e98] [cursor=pointer]:
          - generic [ref=e99]:
            - heading "Sat" [level=2] [ref=e100]
            - img "Mostly Sunny" [ref=e101]
            - generic [ref=e103]: 81°F
          - generic [ref=e104]:
            - generic [ref=e105]:
              - generic [ref=e106]:
                - img "Sunrise" [ref=e107]
                - generic [ref=e108]: 6:00 AM
              - generic [ref=e109]:
                - img "Sunset" [ref=e110]
                - generic [ref=e111]: 8:00 PM
            - generic [ref=e112]:
              - generic [ref=e113]:
                - text: "MORN: YES"
                - img [ref=e114]
              - generic [ref=e115]:
                - text: "AFT: YES"
                - img [ref=e116]
            - generic [ref=e117]: Mostly Sunny
        - generic [ref=e118] [cursor=pointer]:
          - generic [ref=e119]:
            - heading "Sun" [level=2] [ref=e120]
            - img "Mostly Sunny" [ref=e121]
            - generic [ref=e123]: 80°F
          - generic [ref=e124]:
            - generic [ref=e125]:
              - generic [ref=e126]:
                - img "Sunrise" [ref=e127]
                - generic [ref=e128]: 6:00 AM
              - generic [ref=e129]:
                - img "Sunset" [ref=e130]
                - generic [ref=e131]: 8:00 PM
            - generic [ref=e132]:
              - generic [ref=e133]:
                - text: "MORN: YES"
                - img [ref=e134]
              - generic [ref=e135]:
                - text: "AFT: YES"
                - img [ref=e136]
            - generic [ref=e137]: Mostly Sunny
        - generic [ref=e138] [cursor=pointer]:
          - generic [ref=e139]:
            - heading "Mon" [level=2] [ref=e140]
            - img "Sunny" [ref=e141]
            - generic [ref=e143]: 74°F
          - generic [ref=e144]:
            - generic [ref=e145]:
              - generic [ref=e146]:
                - img "Sunrise" [ref=e147]
                - generic [ref=e148]: 6:00 AM
              - generic [ref=e149]:
                - img "Sunset" [ref=e150]
                - generic [ref=e151]: 8:00 PM
            - generic [ref=e152]:
              - generic [ref=e153]:
                - text: "MORN: YES"
                - img [ref=e154]
              - generic [ref=e155]:
                - text: "AFT: YES"
                - img [ref=e156]
            - generic [ref=e157]: Sunny
        - generic [ref=e158] [cursor=pointer]:
          - generic [ref=e159]:
            - heading "Tue" [level=2] [ref=e160]
            - img "Mostly Sunny" [ref=e161]
            - generic [ref=e163]: 72°F
          - generic [ref=e164]:
            - generic [ref=e165]:
              - generic [ref=e166]:
                - img "Sunrise" [ref=e167]
                - generic [ref=e168]: 6:00 AM
              - generic [ref=e169]:
                - img "Sunset" [ref=e170]
                - generic [ref=e171]: 8:00 PM
            - generic [ref=e172]:
              - generic [ref=e173]:
                - text: "MORN: YES"
                - img [ref=e174]
              - generic [ref=e175]:
                - text: "AFT: YES"
                - img [ref=e176]
            - generic [ref=e177]: Mostly Sunny
      - generic [ref=e178]:
        - heading "Today" [level=2] [ref=e179]
        - paragraph [ref=e181]:
          - generic [ref=e182]: "Today:"
          - text: Mostly sunny, with a high near 73. South wind 0 to 10 mph.
        - generic [ref=e183]:
          - generic [ref=e185]:
            - heading "Wave Forecast" [level=2] [ref=e186]
            - paragraph [ref=e187]: "Current Wave Height: N/A"
          - img [ref=e190]
      - generic [ref=e192]:
        - heading "Weather Radar" [level=2] [ref=e193]
        - generic [ref=e195]:
          - generic:
            - generic [ref=e196]:
              - button "Zoom in" [ref=e197] [cursor=pointer]: +
              - button "Zoom out" [ref=e198] [cursor=pointer]: −
            - generic [ref=e199]:
              - link "Leaflet" [ref=e200] [cursor=pointer]:
                - /url: https://leafletjs.com
                - img [ref=e201]
                - text: Leaflet
              - text: "| ©"
              - link "OpenStreetMap" [ref=e205] [cursor=pointer]:
                - /url: https://www.openstreetmap.org/copyright
              - text: contributors, NOAA/NWS
      - paragraph [ref=e207]: This application has been optimized for marine forecasting, but boaters should use their own judgement, consult multiple sources, and abide by all local and federal maritime laws. The creators of this application are not liable for any damages or losses resulting from its use.
  - alert [ref=e208]
```

# Test source

```ts
  1  | // tests/app.spec.js
  2  | import { test, expect } from '@playwright/test'
  3  |
  4  | test.describe('Can I go boating today? App - E2E', () => {
  5  |   test('should load and display a complete weather forecast', async ({ page }) => {
  6  |     // Navigate to the home page
  7  |     await page.goto('/')
  8  |
  9  |     // Wait for the main heading to be visible, indicating the app has loaded
  10 |     await expect(page.locator('h1')).toHaveText('Can I go boating today?')
  11 |
  12 |     // 1. Verify Location Display
  13 |     // Check that the latitude and longitude are displayed, confirming geolocation worked.
  14 |     await expect(page.getByText(/Latitude: 34.0522/)).toBeVisible({ timeout: 15000 })
  15 |     await expect(page.getByText(/Longitude: -118.2437/)).toBeVisible()
  16 |
  17 |     // 2. Verify Current Conditions
  18 |     // Check for the "Current Conditions" heading and that a forecast period (e.g., "Tonight") is visible.
> 19 |     await expect(page.getByRole('heading', { name: 'Current Conditions' })).toBeVisible()
     |                                                                             ^ Error: expect(locator).toBeVisible() failed
  20 |     await expect(page.getByText(/Tonight|Today|This Afternoon/)).toBeVisible()
  21 |
  22 |     // 3. Verify Wave Forecast
  23 |     // Check that the wave forecast component has rendered and displays some value (even "N/A").
  24 |     await expect(page.getByRole('heading', { name: 'Wave Forecast' })).toBeVisible()
  25 |     await expect(page.getByText(/Current Wave Height:/)).toBeVisible()
  26 |
  27 |     // 4. Verify Tide Chart
  28 |     // The chart is rendered in a canvas. We'll check that its title is visible.
  29 |     await expect(page.locator("canvas")).toBeVisible()
  30 |
  31 |     // 5. Verify Radar Map
  32 |     // Check for the "Weather Radar" heading and that the map container is present.
  33 |     await expect(page.getByRole('heading', { name: 'Weather Radar' })).toBeVisible()
  34 |     // The map itself is in a specific container, let's check for the attribution text as a sign it's loaded.
  35 |     await expect(page.getByText(/OpenStreetMap/)).toBeVisible()
  36 |   })
  37 | })
  38 |
```