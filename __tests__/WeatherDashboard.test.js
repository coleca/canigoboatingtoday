import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import WeatherDashboard from '@/components/WeatherDashboard'
import { getNWSForecast, getTideData } from '@/lib/weatherService'

jest.mock('@/lib/weatherService')

// Mock Next.js Image component
jest.mock('next/image', () => ({ src, alt }) => <img src={src} alt={alt} />)

// Mock the DynamicRadarMap
jest.mock('@/components/DynamicRadarMap', () => () => <div data-testid="radar-map" />)

describe('WeatherDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('renders initial layout properly', () => {
    const { container } = render(<WeatherDashboard />)
    expect(screen.getByText('Can I go boating today?')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter a location')).toBeInTheDocument()
    expect(container.querySelector('#loader-overlay')).toBeInTheDocument()
  })
})
