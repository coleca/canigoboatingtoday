import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import WeatherDashboard from '@/components/WeatherDashboard'
import { getNWSForecast, getTideData, searchLocation } from '@/lib/weatherService'

// Mock the entire weatherService module
jest.mock('@/lib/weatherService')

// Mock the global navigator.geolocation object
const mockGeolocation = {
  getCurrentPosition: jest.fn(),
}

beforeAll(() => {
  global.navigator.geolocation = mockGeolocation
})

describe('WeatherDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    window.localStorage.clear()
  })

  test('displays loading state initially', () => {
    render(<WeatherDashboard />)
    // Corrected: Update the loading text to match the component
    expect(screen.getByText('Loading forecast data...')).toBeInTheDocument()
  })

  test('displays weather and tide data on successful fetch', async () => {
    const mockPosition = {
      coords: { latitude: 34.0522, longitude: -118.2437 },
    }
    mockGeolocation.getCurrentPosition.mockImplementationOnce((success) =>
      success(mockPosition)
    )

    // Mock successful API responses for both services
    const mockWeatherData = {
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
            windSpeed: '5 mph',
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
            temperature: 71,
            temperatureUnit: 'F',
            windSpeed: '9 mph',
            shortForecast: 'Sunny',
            startTime: '2026-03-21T10:00:00-04:00',
          },
        ],
      },
      alerts: [],
      meta: { city: 'Los Angeles', state: 'CA' },
    }
    const mockTideData = {
      predictions: [{ t: '2025-11-17 12:00', v: '3.5' }],
      station: { id: '2', name: 'Closest Station' },
    }
    getNWSForecast.mockResolvedValue(mockWeatherData)
    getTideData.mockResolvedValue(mockTideData) // Corrected: Mock getTideData

    render(<WeatherDashboard />)

    await waitFor(() => {
      // Verify all expected data is on the screen
      expect(screen.getByText(/Latitude: 34.0522/)).toBeInTheDocument()
      expect(screen.getByText('Los Angeles, CA')).toBeInTheDocument()
      expect(screen.getAllByText('Today').length).toBeGreaterThan(0)
      expect(screen.getByText('Sunny skies.')).toBeInTheDocument()
      expect(screen.getByText(/Nearest station: Closest Station/)).toBeInTheDocument()
    })
  })

  test('displays an error message if an API call fails', async () => {
    const mockPosition = {
      coords: { latitude: 34.0522, longitude: -118.2437 },
    }
    mockGeolocation.getCurrentPosition.mockImplementationOnce((success) =>
      success(mockPosition)
    )

    // Simulate one of the API calls failing
    const apiError = new Error('API is down')
    getNWSForecast.mockRejectedValue(apiError)
    getTideData.mockResolvedValue({ predictions: [] }) // Ensure the other promise resolves

    render(<WeatherDashboard />)

    await waitFor(() => {
      // Corrected: Update the error message to match the component
      expect(
        screen.getByText('Error: Failed to fetch data: API is down')
      ).toBeInTheDocument()
    })
  })

  test('falls back to a searchable U.S. location when geolocation fails', async () => {
    const mockError = new Error('User denied Geolocation')
    mockGeolocation.getCurrentPosition.mockImplementationOnce(
      (success, error) => error(mockError)
    )
    searchLocation.mockResolvedValue({
      name: 'Annapolis, MD',
      latitude: 38.9784,
      longitude: -76.4922,
    })
    getNWSForecast.mockResolvedValue({
      forecast: {
        periods: [
          {
            number: 1,
            name: 'Today',
            isDaytime: true,
            temperature: 65,
            temperatureUnit: 'F',
            windSpeed: '8 mph',
            shortForecast: 'Sunny',
            detailedForecast: 'Sunny skies.',
            probabilityOfPrecipitation: { value: 10 },
          },
        ],
      },
      hourly: { periods: [] },
      alerts: [],
      meta: { city: 'Annapolis', state: 'MD' },
    })
    getTideData.mockResolvedValue({ predictions: [] })

    render(<WeatherDashboard />)

    await waitFor(() => {
      expect(screen.getAllByText('Annapolis, MD').length).toBeGreaterThan(0)
    })
  })
})
