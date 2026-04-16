import { getNWSForecast, getTideData } from '@/lib/weatherService'

// Mock the global fetch function before all tests
global.fetch = jest.fn()

describe('weatherService', () => {
  // Clear all mock implementations and call counts before each test
  beforeEach(() => {
    fetch.mockClear()
    sessionStorage.clear()
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
      expect(forecast).toEqual({ ...mockForecastData.properties, gridData: { testGrid: true } })

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
        'forecast:34.05,-118.24',
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

    test('throws an error if coordinates are invalid', async () => {
      await expect(getNWSForecast(91, -118.2437)).rejects.toThrow('Invalid latitude or longitude provided.')
      await expect(getNWSForecast(34.0522, -181)).rejects.toThrow('Invalid latitude or longitude provided.')
      await expect(getNWSForecast('34', -118.2437)).rejects.toThrow('Invalid latitude or longitude provided.')
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
        'tideData:34.05,-118.24',
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
})
