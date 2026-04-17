import React from 'react'
import { render, screen } from '@testing-library/react'
import RadarMap from '@/components/RadarMap'

// Mock the react-leaflet library to avoid rendering a real map in tests.
// We can assert that our custom props (like URL and layers) are passed correctly.
const mockSetView = jest.fn()

jest.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="map-container">{children}</div>,
  useMap: () => ({
    setView: mockSetView,
  }),
  TileLayer: ({ url, attribution }) => (
    <div data-testid="tile-layer" data-url={url} data-attribution={attribution}></div>
  ),
}))

describe('RadarMap', () => {
  const mockLocation = {
    latitude: 34.0522,
    longitude: -118.2437,
  }

  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-04-16T16:25:00Z'))
    mockSetView.mockClear()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  test('renders the map container and tile layers', () => {
    render(<RadarMap location={mockLocation} />)

    // Check that the main container and both layers are rendered
    expect(screen.getByTestId('map-container')).toBeInTheDocument()
    expect(screen.getAllByTestId('tile-layer')).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Latest' })).toBeInTheDocument()
  })

  test('configures the tile layers with the correct URLs and options', () => {
    render(<RadarMap location={mockLocation} />)

    // Verify the base map layer is from OpenStreetMap
    const [tileLayer, radarLayer] = screen.getAllByTestId('tile-layer')
    expect(tileLayer).toHaveAttribute('data-url', 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')

    expect(radarLayer).toHaveAttribute(
      'data-url',
      expect.stringContaining(
        'https://nowcoast.noaa.gov/arcgis/rest/services/nowcoast/radar_meteo_imagery_nexrad_time/MapServer/tile/{z}/{y}/{x}?blankTile=false&time='
      )
    )
    expect(radarLayer).toHaveAttribute('data-attribution', 'NOAA/NWS nowCOAST')
    expect(screen.getByText(/Frame/)).toBeInTheDocument()
  })

  test('recenters the map when a location is provided', () => {
    render(<RadarMap location={mockLocation} />)

    expect(mockSetView).toHaveBeenCalledWith([34.0522, -118.2437])
  })

  test('renders a loading state if location is not provided', () => {
    render(<RadarMap location={null} />)
    expect(screen.getByText('Loading map...')).toBeInTheDocument()
  })
})
