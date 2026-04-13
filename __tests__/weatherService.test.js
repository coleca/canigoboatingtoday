import { getNWSForecast } from '@/lib/weatherService'

// Mock the global fetch function before all tests
global.fetch = jest.fn()

describe('weatherService', () => {
  // Clear all mock implementations and call counts before each test
  beforeEach(() => {
    fetch.mockClear()
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
        // Second call for the actual forecast
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockForecastData,
        })

      const forecast = await getNWSForecast(latitude, longitude)

      // Expect the final forecast properties to be returned
      expect(forecast).toEqual(mockForecastData.properties)

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

      // Expect the function to reject with an error
      await expect(getNWSForecast(latitude, longitude)).rejects.toThrow(
        'NWS forecast API request failed: Internal Server Error'
      )
    })

    test('throws an error if coordinates are invalid', async () => {
      await expect(getNWSForecast(91, -118.2437)).rejects.toThrow('Invalid coordinates provided.')
      await expect(getNWSForecast(34.0522, -181)).rejects.toThrow('Invalid coordinates provided.')
      await expect(getNWSForecast('34', -118.2437)).rejects.toThrow('Invalid coordinates provided.')
    })
  })
})
