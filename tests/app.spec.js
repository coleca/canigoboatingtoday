// tests/app.spec.js
import { test, expect } from '@playwright/test'

const losAngelesForecastUrl = 'https://api.weather.gov/gridpoints/LOX/154,44/forecast'
const losAngelesGridUrl = 'https://api.weather.gov/gridpoints/LOX/154,44'
const newYorkForecastUrl = 'https://api.weather.gov/gridpoints/OKX/33,35/forecast'
const newYorkGridUrl = 'https://api.weather.gov/gridpoints/OKX/33,35'
const miamiForecastUrl = 'https://api.weather.gov/gridpoints/MFL/110,50/forecast'
const miamiGridUrl = 'https://api.weather.gov/gridpoints/MFL/110,50'

async function mockForecastApis(page) {
  await page.route('https://api.weather.gov/points/**', async (route) => {
    const url = route.request().url()

    if (url.includes('25.7617,-80.1918')) {
      await route.fulfill({
        json: {
          properties: {
            forecast: miamiForecastUrl,
            forecastGridData: miamiGridUrl,
            county: 'https://api.weather.gov/zones/county/FLC086',
            forecastZone: 'https://api.weather.gov/zones/forecast/AMZ651',
            radarStation: 'KAMX',
          },
        },
      })
      return
    }

    if (url.includes('40.7128,-74.006')) {
      await route.fulfill({
        json: {
          properties: {
            forecast: newYorkForecastUrl,
            forecastGridData: newYorkGridUrl,
            county: 'https://api.weather.gov/zones/county/NYC061',
            forecastZone: 'https://api.weather.gov/zones/forecast/ANZ338',
            radarStation: 'KOKX',
          },
        },
      })
      return
    }

    await route.fulfill({
      json: {
        properties: {
          forecast: losAngelesForecastUrl,
          forecastGridData: losAngelesGridUrl,
          county: 'https://api.weather.gov/zones/county/CAC037',
          forecastZone: 'https://api.weather.gov/zones/forecast/PZZ655',
          radarStation: 'KSOX',
        },
      },
    })
  })

  await page.route('https://api.weather.gov/gridpoints/**', async (route) => {
    const url = route.request().url()

    if (url === miamiForecastUrl) {
      await route.fulfill({
        json: {
          properties: {
            periods: [
              {
                name: 'Thursday',
                isDaytime: true,
                temperature: 84,
                temperatureUnit: 'F',
                shortForecast: 'Sunny',
                detailedForecast: 'Sunny. Seas around 2 feet.',
                startTime: '2026-04-16T09:00:00-04:00',
                icon: 'https://api.weather.gov/icons/land/day/few?size=medium',
              },
              {
                name: 'Tonight',
                isDaytime: false,
                temperature: 76,
                temperatureUnit: 'F',
                shortForecast: 'Mostly clear',
                detailedForecast: 'Mostly clear. Seas around 1 foot.',
                startTime: '2026-04-16T18:00:00-04:00',
                icon: 'https://api.weather.gov/icons/land/night/few?size=medium',
              },
            ],
          },
        },
      })
      return
    }

    if (url === newYorkForecastUrl) {
      await route.fulfill({
        json: {
          properties: {
            periods: [
              {
                name: 'Thursday',
                isDaytime: true,
                temperature: 62,
                temperatureUnit: 'F',
                shortForecast: 'Cloudy',
                detailedForecast: 'Cloudy. Seas around 3 feet.',
                startTime: '2026-04-16T09:00:00-04:00',
                icon: 'https://api.weather.gov/icons/land/day/few?size=medium',
              },
              {
                name: 'Tonight',
                isDaytime: false,
                temperature: 54,
                temperatureUnit: 'F',
                shortForecast: 'Mostly cloudy',
                detailedForecast: 'Mostly cloudy. Seas around 2 feet.',
                startTime: '2026-04-16T18:00:00-04:00',
                icon: 'https://api.weather.gov/icons/land/night/few?size=medium',
              },
            ],
          },
        },
      })
      return
    }

    if (url === losAngelesForecastUrl) {
      await route.fulfill({
        json: {
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
        },
      })
      return
    }

    await route.fulfill({
      json: {
        properties: {
          temperature: { values: [] },
          windSpeed: { values: [] },
          probabilityOfPrecipitation: { values: [] },
          waveHeight: { values: [] },
        },
      },
    })
  })

  await page.route('https://api.weather.gov/alerts/active**', async (route) => {
    const url = route.request().url()

    if (url.includes('34.0522,-118.2437') || url.includes('zone=PZZ655')) {
      await route.fulfill({
        json: {
          features: [
            {
              id: 'small-craft-advisory',
              properties: {
                event: 'Small Craft Advisory',
                severity: 'Moderate',
                urgency: 'Expected',
                headline: 'Small Craft Advisory in effect through tonight.',
                areaDesc: 'Inner waters',
                expires: '2026-04-16T23:00:00-07:00',
                geocode: {
                  UGC: ['PZZ655'],
                },
              },
            },
          ],
        },
      })
      return
    }

    await route.fulfill({
      json: {
        features: [],
      },
    })
  })

  await page.route(
    'https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json?type=tidepredictions',
    async (route) => {
      await route.fulfill({
        json: {
          stations: [{ id: '9410660', lat: 34.05, lng: -118.24, name: 'Los Angeles' }],
        },
      })
    }
  )

  await page.route('https://api.tidesandcurrents.noaa.gov/api/prod/datagetter**', async (route) => {
    await route.fulfill({
      json: {
        predictions: [
          { t: '2026-04-16 00:00', v: '1.1' },
          { t: '2026-04-16 06:00', v: '3.4' },
          { t: '2026-04-16 12:00', v: '0.8' },
          { t: '2026-04-16 18:00', v: '2.9' },
        ],
      },
    })
  })

  await page.route('https://geocoding-api.open-meteo.com/v1/search**', async (route) => {
    await route.fulfill({
      json: {
        results: [{ name: 'Miami', latitude: 25.7617, longitude: -80.1918 }],
      },
    })
  })

  await page.route('https://api.open-meteo.com/v1/forecast**', async (route) => {
    const url = route.request().url()

    if (url.includes('latitude=25.7617') && url.includes('longitude=-80.1918')) {
      await route.fulfill({
        json: {
          daily: {
            time: ['2026-04-16'],
            sunrise: ['2026-04-16T06:57'],
            sunset: ['2026-04-16T19:46'],
          },
          hourly: {
            time: ['2026-04-16T00:00', '2026-04-16T01:00'],
            temperature_2m: [26, 26],
            wind_speed_10m: [14, 14],
            precipitation_probability: [10, 10],
          },
        },
      })
      return
    }

    if (url.includes('latitude=40.7128') && url.includes('longitude=-74.006')) {
      await route.fulfill({
        json: {
          daily: {
            time: ['2026-04-16'],
            sunrise: ['2026-04-16T06:18'],
            sunset: ['2026-04-16T19:34'],
          },
          hourly: {
            time: ['2026-04-16T00:00', '2026-04-16T01:00'],
            temperature_2m: [17, 17],
            wind_speed_10m: [12, 12],
            precipitation_probability: [20, 20],
          },
        },
      })
      return
    }

    await route.fulfill({
      json: {
        daily: {
          time: ['2026-04-16'],
          sunrise: ['2026-04-16T06:24'],
          sunset: ['2026-04-16T19:19'],
        },
        hourly: {
          time: ['2026-04-16T00:00', '2026-04-16T01:00'],
          temperature_2m: [20, 20],
          wind_speed_10m: [13, 13],
          precipitation_probability: [15, 15],
        },
      },
    })
  })

  await page.route('https://marine-api.open-meteo.com/v1/marine**', async (route) => {
    const url = route.request().url()

    if (url.includes('latitude=25.7617') && url.includes('longitude=-80.1918')) {
      await route.fulfill({
        json: {
          hourly: {
            time: ['2026-04-16T07:00'],
            wave_height: [1.0],
          },
          daily: {
            time: ['2026-04-16'],
            wave_height_max: [1.0],
          },
        },
      })
      return
    }

    if (url.includes('latitude=40.7128') && url.includes('longitude=-74.006')) {
      await route.fulfill({
        json: {
          hourly: {
            time: ['2026-04-16T07:00'],
            wave_height: [1.3],
          },
          daily: {
            time: ['2026-04-16'],
            wave_height_max: [1.3],
          },
        },
      })
      return
    }

    await route.fulfill({
      json: {
        hourly: {
          time: ['2026-04-16T07:00'],
          wave_height: [1.2],
        },
        daily: {
          time: ['2026-04-16'],
          wave_height_max: [1.2],
        },
      },
    })
  })
}

test.describe('Can I go boating today? App - E2E', () => {
  test.beforeEach(async ({ page }) => {
    await mockForecastApis(page)
  })

  test('loads the app with geolocation and shows the main forecast experience', async ({ page }) => {
    await page.goto('/')

    await expect(page.locator('h1')).toHaveText('Can I go boating today?')
    await expect(page.getByText(/Latitude: 34.0522/)).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(/Longitude: -118.2437/)).toBeVisible()
    await expect(page.locator('#charts-container .chart-container')).toHaveCount(5, { timeout: 15000 })
    await expect(page.getByText('Wave Forecast')).toHaveCount(0)
    await expect(page.getByText('Wave N/A')).toHaveCount(0)
    await expect(page.locator('[aria-label^="Sunrise at"]').first()).toBeVisible()
    await expect(page.locator('[aria-label^="Sunset at"]').first()).toBeVisible()
    await expect(page.getByText('MORN:').first()).toBeVisible()
    await expect(page.getByText('AFT:').first()).toBeVisible()
    await expect(page.locator('#weather-forecast').getByText(/YES|NO/).first()).toBeVisible()
    await expect(page.getByText('Small Craft Advisory').first()).toBeVisible()
    await expect(page.locator('#radar-map-container')).toBeVisible()

    await page.locator('#radar-map-container').scrollIntoViewIfNeeded()
    await expect(page.getByRole('heading', { name: 'Weather Radar Loop' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Open full NWS radar page' })).toHaveAttribute(
      'href',
      'https://radar.weather.gov/station/ksox/standard'
    )
  })

  test('falls back to New York when browser geolocation fails', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window.navigator, 'geolocation', {
        configurable: true,
        value: {
          getCurrentPosition: (_success, error) => error(new Error('Denied')),
        },
      })
    })

    await page.goto('/')

    await expect(page.getByText('New York')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('#charts-container .chart-container')).toHaveCount(5, { timeout: 15000 })
  })

  test('supports searching for a different location manually', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByText(/Latitude: 34.0522/)).toBeVisible({ timeout: 15000 })

    await page.getByPlaceholder('Enter a location').fill('Miami')
    await page.getByRole('button', { name: 'Get Weather' }).click()

    await expect(page.getByText('Miami')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('#charts-container .chart-container')).toHaveCount(5, { timeout: 15000 })
    await expect(page.getByText('Wave N/A')).toHaveCount(0)
  })
})
