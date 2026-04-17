import { geocodeLocation, getNWSAlerts, getNWSForecast, getTideData } from '@/lib/weatherService'

// Mock the global fetch function before all tests
global.fetch = jest.fn()

describe('weatherService', () => {
  // Clear all mock implementations and call counts before each test
  beforeEach(() => {
    fetch.mockClear()
    sessionStorage.clear()
    localStorage.clear()
  })

  describe('getNWSForecast', () => {
    const latitude = 34.0522
    const longitude = -118.2437
    const originalEnv = process.env

    beforeEach(() => {
      jest.resetModules()
      process.env = { ...originalEnv }
    })

    afterAll(() => {
      process.env = originalEnv
    })

    // Mock data for a successful NWS API response chain
    const mockPointsData = {
      properties: {
        forecast: 'https://api.weather.gov/gridpoints/LOX/15,33/forecast',
        forecastGridData: 'https://api.weather.gov/gridpoints/LOX/15,33',
        radarStation: 'KSOX',
      },
    }
    const mockForecastData = {
      properties: {
        periods: [{ name: 'Today', detailedForecast: 'Sunny.' }],
      },
    }

    test('successfully fetches and returns forecast data', async () => {
      // Set up the mock chain for fetch
      fetch
        // First call for gridpoints
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPointsData,
        })
        // Second & Third calls for forecast & gridData (Promise.all)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockForecastData,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ properties: { testGrid: true } }),
        })

      const forecast = await getNWSForecast(latitude, longitude)

      // Expect the final forecast properties to be returned
      expect(forecast).toEqual({
        ...mockForecastData.properties,
        gridData: { testGrid: true },
        radarStation: 'KSOX',
      })

      // Verify fetch was called correctly for the first (points) request
      expect(fetch).toHaveBeenCalledWith(
        `https://api.weather.gov/points/${latitude},${longitude}`,
        {
          headers: {
            'User-Agent': 'CanIGoBoatingToday/1.0 (canigoboatingtoday.com, hello@canigoboatingtoday.com)',
          },
        }
      )

      // Verify fetch was called correctly for the second (forecast) request
      expect(fetch).toHaveBeenCalledWith(mockPointsData.properties.forecast, {
        headers: {
          'User-Agent': 'CanIGoBoatingToday/1.0 (canigoboatingtoday.com, hello@canigoboatingtoday.com)',
        },
      })
    })

    test('returns cached forecast data without refetching', async () => {
      sessionStorage.setItem(
        'forecast:v2:34.05,-118.24',
        JSON.stringify({
          timestamp: Date.now(),
          payload: { periods: [{ name: 'Cached Today' }], gridData: { cached: true } },
        })
      )

      const forecast = await getNWSForecast(latitude, longitude)

      expect(forecast).toEqual({ periods: [{ name: 'Cached Today' }], gridData: { cached: true } })
      expect(fetch).not.toHaveBeenCalled()
    })


    test('throws an error if the points API request fails', async () => {
      // Simulate a failed response from the points API
      fetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
      })

      // Expect the function to reject with an error
      await expect(getNWSForecast(latitude, longitude)).rejects.toThrow(
        'NWS points API request failed: Not Found'
      )
    })

    test('throws an error if the forecast API request fails', async () => {
      // Simulate a successful points request followed by a failed forecast request
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPointsData,
        })
        .mockResolvedValueOnce({
          ok: false,
          statusText: 'Internal Server Error',
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ properties: {} })
        })

      // Expect the function to reject with an error
      await expect(getNWSForecast(latitude, longitude)).rejects.toThrow(
        'NWS forecast API request failed: Internal Server Error'
      )
    })

    test('refreshes stale point metadata and retries once when the forecast URL returns 404', async () => {
      sessionStorage.setItem(
        'points:v2:34.05,-118.24',
        JSON.stringify({
          timestamp: Date.now(),
          payload: {
            properties: {
              forecast: 'https://api.weather.gov/gridpoints/OLD/1,1/forecast',
              forecastGridData: 'https://api.weather.gov/gridpoints/OLD/1,1',
              radarStation: 'KOLD',
            },
          },
        })
      )

      fetch
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found',
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ properties: {} }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPointsData,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockForecastData,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ properties: { refreshedGrid: true } }),
        })

      const forecast = await getNWSForecast(latitude, longitude)

      expect(forecast).toEqual({
        ...mockForecastData.properties,
        gridData: { refreshedGrid: true },
        radarStation: 'KSOX',
      })
      expect(fetch).toHaveBeenNthCalledWith(3, `https://api.weather.gov/points/${latitude},${longitude}`, {
        headers: {
          'User-Agent': 'CanIGoBoatingToday/1.0 (canigoboatingtoday.com, hello@canigoboatingtoday.com)',
        },
      })
    })

    test('adds a marine wave fallback forecast when the main point has no wave grid data', async () => {
      const originalPointsData = {
        properties: {
          forecast: 'https://api.weather.gov/gridpoints/LOX/15,33/forecast',
          forecastGridData: 'https://api.weather.gov/gridpoints/LOX/15,33',
          radarStation: 'KSOX',
        },
      }
      const originalForecastData = {
        properties: {
          periods: [{ name: 'Today', detailedForecast: 'Sunny.' }],
        },
      }
      const marinePointsData = {
        properties: {
          forecast: 'https://api.weather.gov/gridpoints/PZZ/10,20/forecast',
          forecastGridData: 'https://api.weather.gov/gridpoints/PZZ/10,20',
          radarStation: 'KSOX',
        },
      }
      const marineForecastData = {
        properties: {
          periods: [{ name: 'Today', detailedForecast: 'Seas 3 to 4 feet.' }],
        },
      }

      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => originalPointsData,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => originalForecastData,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ properties: { waveHeight: { values: [] } } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            stations: [{ id: 'marine-1', lat: 34.01, lng: -118.5 }],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => marinePointsData,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => marineForecastData,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            properties: {
              waveHeight: {
                values: [{ validTime: '2026-04-16T00:00:00-07:00/PT24H', value: 1.2 }],
              },
            },
          }),
        })

      const forecast = await getNWSForecast(latitude, longitude)

      expect(forecast.marineGridData).toEqual({
        waveHeight: {
          values: [{ validTime: '2026-04-16T00:00:00-07:00/PT24H', value: 1.2 }],
        },
      })
      expect(forecast.marinePeriods).toEqual(marineForecastData.properties.periods)
    })

    test('throws an error if coordinates are invalid', async () => {
      await expect(getNWSForecast(91, -118.2437)).rejects.toThrow('Invalid latitude or longitude provided.')
      await expect(getNWSForecast(34.0522, -181)).rejects.toThrow('Invalid latitude or longitude provided.')
      await expect(getNWSForecast('34', -118.2437)).rejects.toThrow('Invalid latitude or longitude provided.')
    })
  })

  describe('getNWSAlerts', () => {
    test('combines point and zone alerts, then keeps marine-relevant hazards only', async () => {
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            properties: {
              county: 'https://api.weather.gov/zones/county/CAC037',
              forecastZone: 'https://api.weather.gov/zones/forecast/ANZ338',
              gridId: 'LOX',
              radarStation: 'KSOX',
              relativeLocation: {
                properties: {
                  city: 'Los Angeles',
                  state: 'CA',
                },
              },
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            features: [
              {
                id: 'special-marine-warning',
                properties: {
                  event: 'Special Marine Warning',
                  severity: 'Severe',
                  urgency: 'Immediate',
                  geocode: { UGC: ['ANZ338'] },
                },
              },
              {
                id: 'heat-advisory',
                properties: {
                  event: 'Heat Advisory',
                  severity: 'Moderate',
                  urgency: 'Expected',
                  geocode: { UGC: ['CAZ041'] },
                },
              },
            ],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            features: [
              {
                id: 'special-marine-warning',
                properties: {
                  event: 'Special Marine Warning',
                  severity: 'Severe',
                  urgency: 'Immediate',
                  geocode: { UGC: ['ANZ338'] },
                },
              },
            ],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            features: [
              {
                id: 'small-craft-advisory',
                properties: {
                  event: 'Small Craft Advisory',
                  severity: 'Moderate',
                  urgency: 'Expected',
                  geocode: { UGC: ['ANZ338'] },
                },
              },
            ],
          }),
        })

      const alertsData = await getNWSAlerts(34.0522, -118.2437)

      expect(alertsData.locationContext).toEqual({
        county: 'CAC037',
        forecastZone: 'ANZ338',
        forecastOffice: 'LOX',
        radarStation: 'KSOX',
        city: 'Los Angeles',
        state: 'CA',
      })
      expect(alertsData.alerts).toHaveLength(2)
      expect(alertsData.alerts.map((alert) => alert.id)).toEqual([
        'special-marine-warning',
        'small-craft-advisory',
      ])
    })

    test('returns cached alerts without refetching', async () => {
      sessionStorage.setItem(
        'alerts:v2:34.05,-118.24',
        JSON.stringify({
          timestamp: Date.now(),
          payload: {
            alerts: [{ id: 'cached-alert', properties: { event: 'Small Craft Advisory' } }],
            locationContext: { forecastZone: 'ANZ338' },
          },
        })
      )

      const alertsData = await getNWSAlerts(34.0522, -118.2437)

      expect(alertsData).toEqual({
        alerts: [{ id: 'cached-alert', properties: { event: 'Small Craft Advisory' } }],
        locationContext: { forecastZone: 'ANZ338' },
      })
      expect(fetch).not.toHaveBeenCalled()
    })

    test('throws when coordinates are invalid', async () => {
      await expect(getNWSAlerts(91, -118.2437)).rejects.toThrow(
        'Invalid latitude or longitude provided.'
      )
    })
  })

  describe('getTideData', () => {
    test('falls back to the next nearby station when the closest station has no predictions', async () => {
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            stations: [
              { id: '1', lat: 34.0522, lng: -118.2437, name: 'Closest' },
              { id: '2', lat: 34.0622, lng: -118.2437, name: 'Backup' },
            ],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ predictions: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            predictions: [{ t: '2026-04-16 12:00', v: '2.4' }],
          }),
        })

      const tideData = await getTideData(34.0522, -118.2437)

      expect(tideData).toEqual({
        predictions: [{ t: '2026-04-16 12:00', v: '2.4' }],
      })
      expect(fetch).toHaveBeenCalledTimes(3)
    })

    test('returns cached tide data without refetching', async () => {
      sessionStorage.setItem(
        'tideData:v2:34.05,-118.24',
        JSON.stringify({
          timestamp: Date.now(),
          payload: { predictions: [{ t: '2026-04-16 13:00', v: '1.9' }] },
        })
      )

      const tideData = await getTideData(34.0522, -118.2437)

      expect(tideData).toEqual({
        predictions: [{ t: '2026-04-16 13:00', v: '1.9' }],
      })
      expect(fetch).not.toHaveBeenCalled()
    })

    test('throws when coordinates are invalid', async () => {
      await expect(getTideData(91, -118.2437)).rejects.toThrow('Invalid latitude or longitude provided.')
    })
  })

  describe('geocodeLocation', () => {
    test('returns cached geocode results without refetching', async () => {
      localStorage.setItem(
        'geocode:v2:san diego',
        JSON.stringify({
          timestamp: Date.now(),
          payload: { name: 'San Diego', latitude: 32.7157, longitude: -117.1611 },
        })
      )

      const location = await geocodeLocation('San Diego')

      expect(location).toEqual({ name: 'San Diego', latitude: 32.7157, longitude: -117.1611 })
      expect(fetch).not.toHaveBeenCalled()
    })

    test('fetches and caches geocode results', async () => {
      fetch.mockResolvedValueOnce({
        json: async () => ({
          results: [{ name: 'Miami', latitude: 25.7617, longitude: -80.1918 }],
        }),
      })

      const location = await geocodeLocation('Miami')

      expect(location).toEqual({ name: 'Miami', latitude: 25.7617, longitude: -80.1918 })
      expect(fetch).toHaveBeenCalledTimes(1)
    })
  })
})
