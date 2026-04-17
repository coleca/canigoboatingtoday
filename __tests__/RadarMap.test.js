import React from 'react'
import { render, screen } from '@testing-library/react'
import RadarMap from '@/components/RadarMap'

describe('RadarMap', () => {
  const mockLocation = {
    latitude: 34.0522,
    longitude: -118.2437,
  }

  test('renders the animated radar loop for the nearest station', () => {
    render(<RadarMap location={mockLocation} radarStation="ksox" />)

    const radarImage = screen.getByAltText('Animated weather radar loop for station KSOX')
    expect(radarImage).toHaveAttribute(
      'src',
      'https://radar.weather.gov/ridge/standard/KSOX_loop.gif'
    )
    expect(screen.getByText('Official NWS radar loop from station KSOX.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open full NWS radar page' })).toHaveAttribute(
      'href',
      'https://radar.weather.gov/station/ksox/standard'
    )
  })

  test('renders a fallback message when no radar station is available', () => {
    render(<RadarMap location={{ latitude: 26.93, longitude: -82.05 }} radarStation={null} />)

    expect(
      screen.getByText('Official NWS radar loop from station KTBW.')
    ).toBeInTheDocument()
  })

  test('renders a loading state if location is not provided', () => {
    render(<RadarMap location={null} radarStation="KSOX" />)
    expect(screen.getByText('Loading radar...')).toBeInTheDocument()
  })
})
