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
      periods: [{ name: 'Today', detailedForecast: 'Sunny skies.' }],
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
      expect(screen.getByRole('heading', { name: 'Current Conditions' })).toBeInTheDocument()
      expect(screen.getByText('Today:')).toBeInTheDocument()
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
      periods: [{ name: 'Today', detailedForecast: 'Sunny skies.' }],
    })
    getTideData.mockResolvedValue({ predictions: [] })

    render(<WeatherDashboard />)

    await waitFor(() => {
      expect(screen.getByText('Annapolis, MD')).toBeInTheDocument()
    })
  })
})
