import React from 'react'
import { render, screen } from '@testing-library/react'
import RadarMap from '@/components/RadarMap'

// Mock the react-leaflet library to avoid rendering a real map in tests.
// We can assert that our custom props (like URL and layers) are passed correctly.
jest.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="map-container">{children}</div>,
  TileLayer: ({ url, attribution }) => (
    <div data-testid="tile-layer" data-url={url} data-attribution={attribution}></div>
  ),
  WMSTileLayer: ({ url, layers }) => (
    <div data-testid="wms-layer" data-url={url} data-layers={layers}></div>
  ),
}))

describe('RadarMap', () => {
  const mockLocation = {
    latitude: 34.0522,
    longitude: -118.2437,
  }

  test('renders the map container and tile layers', () => {
    render(<RadarMap location={mockLocation} />)

    // Check that the main container and both layers are rendered
    expect(screen.getByTestId('map-container')).toBeInTheDocument()
    expect(screen.getByTestId('tile-layer')).toBeInTheDocument()
    expect(screen.getByTestId('wms-layer')).toBeInTheDocument()
  })

  test('configures the tile layers with the correct URLs and options', () => {
    render(<RadarMap location={mockLocation} />)

    // Verify the base map layer is from OpenStreetMap
    const tileLayer = screen.getByTestId('tile-layer')
    expect(tileLayer).toHaveAttribute('data-url', 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')

    // Verify the WMS layer is pointing to the correct NOAA service and layer
    const wmsLayer = screen.getByTestId('wms-layer')
    expect(wmsLayer).toHaveAttribute('data-url', 'https://opengeo.ncep.noaa.gov/geoserver/conus/conus_cref_qcd/ows')
    expect(wmsLayer).toHaveAttribute('data-layers', 'conus_cref_qcd')
  })

  test('renders a loading state if location is not provided', () => {
    render(<RadarMap location={null} />)
    expect(screen.getByText('Loading map...')).toBeInTheDocument()
  })
})
