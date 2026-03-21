import React from 'react'
import { render, screen } from '@testing-library/react'
import TideChart from '@/components/TideChart'

// Chart.js's reliance on <canvas> makes it tricky to test the actual visual output in JSDOM.
// A common and effective strategy is to confirm that the component renders the canvas element,
// which indicates that Chart.js has been initialized and is ready to draw.
// We mock the 'react-chartjs-2' library to prevent it from actually trying to draw in the test environment.
jest.mock('react-chartjs-2', () => ({
  Line: () => <canvas role="img" />, // Render a mock canvas
}))

describe('TideChart', () => {
  test('renders a canvas element when given valid tide data', () => {
    const mockTideData = {
      predictions: [
        { t: '2025-11-17 12:00', v: '3.5' },
        { t: '2025-11-17 18:00', v: '1.2' },
      ],
    }

    render(<TideChart tideData={mockTideData} />)

    // Check for the presence of the canvas element, identified by its role
    const canvasElement = screen.getByRole('img')
    expect(canvasElement).toBeInTheDocument()
  })

  test('does not throw an error with empty or missing tide data', () => {
    // Render the component with no props, which should result in empty `predictions`
    const { rerender } = render(<TideChart />)
    expect(screen.getByRole('img')).toBeInTheDocument()

    // Rerender with an empty predictions array
    rerender(<TideChart tideData={{ predictions: [] }} />)
    expect(screen.getByRole('img')).toBeInTheDocument()
  })
})
