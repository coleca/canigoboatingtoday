import React from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import WeatherDashboard from '@/components/WeatherDashboard'
import { geocodeLocation, getNWSAlerts, getNWSForecast, getTideData } from '@/lib/weatherService'

jest.mock('@/lib/weatherService', () => ({
  geocodeLocation: jest.fn(),
  getNWSAlerts: jest.fn(),
  getNWSForecast: jest.fn(),
  getTideData: jest.fn(),
}))

jest.mock('next/image', () => ({ src, alt }) => <img src={src} alt={alt} />)

jest.mock('@/components/DynamicRadarMap', () => ({ location }) => (
  <div data-testid="radar-map">
    Radar for {location.latitude}, {location.longitude}
  </div>
))

jest.mock('@/components/TideChart', () => ({ onActiveHourChange }) => (
  <button type="button" onClick={() => onActiveHourChange?.(18)}>
    Today's Tide Predictions
  </button>
))

jest.mock('@/components/charts/HourlyCharts', () => ({
  WindChart: ({ onActiveHourChange }) => (
    <button type="button" onClick={() => onActiveHourChange?.(6)}>
      Wind Speed (mph)
    </button>
  ),
  WaveChart: ({ onActiveHourChange }) => (
    <button type="button" onClick={() => onActiveHourChange?.(7)}>
      Wave Height (ft)
    </button>
  ),
  TempChart: ({ onActiveHourChange }) => (
    <button type="button" onClick={() => onActiveHourChange?.(8)}>
      Temperature (°F)
    </button>
  ),
  PrecipChart: ({ onActiveHourChange }) => (
    <button type="button" onClick={() => onActiveHourChange?.(9)}>
      Precipitation (%)
    </button>
  ),
}))

const DASHBOARD_CACHE_KEY = 'weatherDashboard:lastSuccessfulState'

function buildWeatherData() {
  return {
    periods: [
      {
        name: 'Thursday',
        isDaytime: true,
        temperature: 72,
        temperatureUnit: 'F',
        shortForecast: 'Sunny',
        detailedForecast: 'Sunny, with seas around 2 feet.',
        startTime: '2026-04-16T06:00:00-04:00',
      },
      {
        name: 'Thursday Night',
        isDaytime: false,
        temperature: 62,
        temperatureUnit: 'F',
        shortForecast: 'Mostly clear',
        detailedForecast: 'Mostly clear, with seas around 1 foot.',
        startTime: '2026-04-16T18:00:00-04:00',
      },
      {
        name: 'Friday',
        isDaytime: true,
        temperature: 70,
        temperatureUnit: 'F',
        shortForecast: 'Rain showers',
        detailedForecast: 'Rain likely. Waves 3 to 4 feet.',
        startTime: '2026-04-17T06:00:00-04:00',
      },
    ],
    gridData: {
      windSpeed: {
        values: [{ validTime: '2026-04-16T00:00:00-04:00/PT24H', value: 16 }],
      },
      waveHeight: {
        values: [{ validTime: '2026-04-16T00:00:00-04:00/PT24H', value: 1 }],
      },
      temperature: {
        values: [{ validTime: '2026-04-16T00:00:00-04:00/PT24H', value: 20 }],
      },
      probabilityOfPrecipitation: {
        values: [{ validTime: '2026-04-16T00:00:00-04:00/PT24H', value: 25 }],
      },
    },
  }
}

function buildTideData() {
  return {
    predictions: [
      { t: '2026-04-16 00:00', v: '1.1' },
      { t: '2026-04-16 06:00', v: '3.4' },
      { t: '2026-04-16 18:00', v: '2.9' },
    ],
  }
}

function buildAlertsData() {
  return {
    alerts: [
      {
        id: 'alert-1',
        properties: {
          event: 'Small Craft Advisory',
          severity: 'Moderate',
          urgency: 'Expected',
          headline: 'Small Craft Advisory in effect through this evening.',
          areaDesc: 'Coastal Waters',
          expires: '2026-04-16T22:00:00-04:00',
        },
      },
    ],
    locationContext: {
      forecastZone: 'ANZ000',
    },
  }
}

let intersectionHandler = null

function mockIntersectionObserver() {
  global.IntersectionObserver = jest.fn((callback) => {
    intersectionHandler = callback
    return {
      observe: jest.fn(),
      disconnect: jest.fn(),
      unobserve: jest.fn(),
    }
  })
}

function setNavigatorOnline(value) {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    value,
  })
}

function mockGeolocationSuccess(latitude = 34.0522, longitude = -118.2437) {
  Object.defineProperty(window.navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition: jest.fn((success) =>
        success({
          coords: { latitude, longitude },
        })
      ),
    },
  })
}

function mockGeolocationError() {
  Object.defineProperty(window.navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition: jest.fn((_success, error) => error(new Error('Permission denied'))),
    },
  })
}

function mockGeolocationIdle() {
  Object.defineProperty(window.navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition: jest.fn(),
    },
  })
}

describe('WeatherDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()
    setNavigatorOnline(true)
    mockIntersectionObserver()
    mockGeolocationIdle()
    intersectionHandler = null
    getNWSAlerts.mockResolvedValue({ alerts: [], locationContext: {} })
  })

  test('renders initial layout properly', () => {
    const { container } = render(<WeatherDashboard />)

    expect(screen.getByText('Can I go boating today?')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter a location')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Use current location' })).toBeInTheDocument()
    expect(container.querySelector('#loader-overlay')).toBeInTheDocument()
  })

  test('shows an offline message when the browser is offline', () => {
    setNavigatorOnline(false)

    render(<WeatherDashboard />)

    expect(
      screen.getByText('You are offline. Please check your internet connection.')
    ).toBeInTheDocument()
    expect(getNWSForecast).not.toHaveBeenCalled()
  })

  test('fetches forecast data from geolocation and loads the radar when scrolled into view', async () => {
    mockGeolocationSuccess()
    getNWSForecast.mockResolvedValue(buildWeatherData())
    getTideData.mockResolvedValue(buildTideData())
    getNWSAlerts.mockResolvedValue(buildAlertsData())

    render(<WeatherDashboard />)

    await waitFor(() =>
      expect(getNWSForecast).toHaveBeenCalledWith(34.0522, -118.2437)
    )

    expect(
      screen.getByText('Latitude: 34.0522, Longitude: -118.2437')
    ).toBeInTheDocument()
    expect(screen.getByText('Small Craft Advisory')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Thu' })).toBeInTheDocument()
    expect(screen.getByText('Radar will load as you scroll near it.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Wind Speed (mph)' }))
    expect(screen.getAllByText('6 AM').length).toBeGreaterThan(0)
    expect(screen.getByText('10 mph')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: "Today's Tide Predictions" }))
    expect(screen.getAllByText('6 PM').length).toBeGreaterThan(0)
    expect(screen.getByText('2.9 ft')).toBeInTheDocument()

    act(() => {
      intersectionHandler?.([{ isIntersecting: true }])
    })

    await waitFor(() => expect(screen.getByTestId('radar-map')).toBeInTheDocument())
  })

  test('uses colorful forecast icons in the day grid', async () => {
    mockGeolocationSuccess()
    getNWSForecast.mockResolvedValue(buildWeatherData())
    getTideData.mockResolvedValue(buildTideData())
    getNWSAlerts.mockResolvedValue(buildAlertsData())

    render(<WeatherDashboard />)

    const sunnyIcon = await screen.findByAltText('Sunny')
    const rainIcon = await screen.findByAltText('Rain showers')

    expect(sunnyIcon.style.filter).toContain('drop-shadow')
    expect(sunnyIcon.style.filter).not.toContain('invert(1)')
    expect(rainIcon.style.filter).toContain('hue-rotate(176deg)')
  })

  test('falls back to New York when geolocation is denied', async () => {
    mockGeolocationError()
    getNWSForecast.mockResolvedValue(buildWeatherData())
    getTideData.mockResolvedValue(buildTideData())
    getNWSAlerts.mockResolvedValue(buildAlertsData())

    render(<WeatherDashboard />)

    await waitFor(() =>
      expect(getNWSForecast).toHaveBeenCalledWith(40.7128, -74.006)
    )

    expect(screen.getByText('New York')).toBeInTheDocument()
  })

  test('supports manual location searches', async () => {
    mockGeolocationSuccess()
    getNWSForecast.mockResolvedValue(buildWeatherData())
    getTideData.mockResolvedValue(buildTideData())
    getNWSAlerts.mockResolvedValue(buildAlertsData())
    geocodeLocation.mockResolvedValue({
      name: 'Miami',
      latitude: 25.7617,
      longitude: -80.1918,
    })

    render(<WeatherDashboard />)

    await waitFor(() =>
      expect(getNWSForecast).toHaveBeenCalledWith(34.0522, -118.2437)
    )

    fireEvent.change(screen.getByPlaceholderText('Enter a location'), {
      target: { value: 'Miami' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Get Weather' }))

    await waitFor(() => expect(geocodeLocation).toHaveBeenCalledWith('Miami'))
    await waitFor(() => expect(getNWSForecast).toHaveBeenLastCalledWith(25.7617, -80.1918))

    expect(screen.getByText('Miami')).toBeInTheDocument()
  })

  test('supports refetching from the current-location button', async () => {
    mockGeolocationSuccess(36.8508, -75.9779)
    getNWSForecast.mockResolvedValue(buildWeatherData())
    getTideData.mockResolvedValue(buildTideData())
    getNWSAlerts.mockResolvedValue(buildAlertsData())

    render(<WeatherDashboard />)

    fireEvent.click(screen.getByRole('button', { name: 'Use current location' }))

    await waitFor(() => {
      expect(getNWSForecast).toHaveBeenCalledWith(36.8508, -75.9779)
    })
  })

  test('shows a weather error when the main forecast request fails', async () => {
    mockGeolocationSuccess()
    getNWSForecast.mockRejectedValue(new Error('Forecast is unavailable'))
    getTideData.mockResolvedValue(buildTideData())
    getNWSAlerts.mockResolvedValue(buildAlertsData())

    render(<WeatherDashboard />)

    await waitFor(() =>
      expect(
        screen.getByText('Failed to fetch data: Forecast is unavailable')
      ).toBeInTheDocument()
    )

    expect(screen.queryByText('Thursday')).not.toBeInTheDocument()
  })

  test('keeps the weather UI available when tide loading fails', async () => {
    mockGeolocationSuccess()
    getNWSForecast.mockResolvedValue(buildWeatherData())
    getTideData.mockRejectedValue(new Error('Tide service unavailable'))
    getNWSAlerts.mockResolvedValue(buildAlertsData())

    render(<WeatherDashboard />)

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Thu' })).toBeInTheDocument()
    )

    expect(screen.getByRole('button', { name: 'Wind Speed (mph)' })).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: "Today's Tide Predictions" })
    ).not.toBeInTheDocument()
  })

  test('hydrates from a recent cached dashboard state', () => {
    mockGeolocationIdle()
    localStorage.setItem(
      DASHBOARD_CACHE_KEY,
      JSON.stringify({
        timestamp: Date.now(),
        payload: {
          location: { latitude: 32.7157, longitude: -117.1611 },
          locationName: 'San Diego',
          weatherData: buildWeatherData(),
          tideData: buildTideData(),
          tideStatus: 'ready',
        },
      })
    )

    render(<WeatherDashboard />)

    expect(screen.getByText('San Diego')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Thu' })).toBeInTheDocument()
  })

  test('falls back to forecast text for wave details when hourly wave grid data is missing', async () => {
    mockGeolocationSuccess()
    const weatherData = buildWeatherData()
    weatherData.gridData.waveHeight.values = []
    getNWSForecast.mockResolvedValue(weatherData)
    getTideData.mockResolvedValue(buildTideData())
    getNWSAlerts.mockResolvedValue(buildAlertsData())

    render(<WeatherDashboard />)

    await waitFor(() => {
      expect(screen.getByText('Wave 2 ft')).toBeInTheDocument()
    })
  })

  test('does not render an alert banner when no marine alerts are active', async () => {
    mockGeolocationSuccess()
    getNWSForecast.mockResolvedValue(buildWeatherData())
    getTideData.mockResolvedValue(buildTideData())

    render(<WeatherDashboard />)

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Thu' })).toBeInTheDocument()
    )

    expect(screen.queryByText('NOAA / NWS Boater Alerts')).not.toBeInTheDocument()
  })
})
