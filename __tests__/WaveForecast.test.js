import React from 'react'
import { render, screen } from '@testing-library/react'
import WaveForecast from '@/components/WaveForecast'

describe('WaveForecast', () => {
  test('displays the correct wave height from a forecast string', () => {
    const forecast = 'Partly cloudy with a chance of rain. Seas around 3 feet.'
    render(<WaveForecast forecast={forecast} />)

    // Check that the component correctly parses and displays the wave height
    expect(screen.getByText('Current Wave Height:')).toBeInTheDocument()
    expect(screen.getByText('3 ft')).toBeInTheDocument()
  })

  test('displays "N/A" when wave height cannot be parsed', () => {
    const forecast = 'Sunny and clear.'
    render(<WaveForecast forecast={forecast} />)

    // Check that it gracefully handles cases where no wave data is present
    expect(screen.getByText('Current Wave Height:')).toBeInTheDocument()
    expect(screen.getByText('N/A')).toBeInTheDocument()
  })
})
