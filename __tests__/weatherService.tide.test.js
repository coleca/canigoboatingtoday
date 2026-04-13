import { getTideData } from '@/lib/weatherService'
import { getHaversineDistance } from '@/lib/locationUtils'

// Mock the locationUtils module
jest.mock('@/lib/locationUtils', () => {
  const original = jest.requireActual('@/lib/locationUtils');
  return {
    ...original,
    getHaversineDistance: jest.fn(),
    getHaversineDistanceOptimized: jest.fn(),
  };
})

// Mock the global fetch and localStorage
global.fetch = jest.fn()

let mockLocalStorage = {}
beforeAll(() => {
  global.Storage.prototype.setItem = jest.fn((key, value) => {
    mockLocalStorage[key] = value
  })
  global.Storage.prototype.getItem = jest.fn((key) => mockLocalStorage[key])
  global.Storage.prototype.removeItem = jest.fn((key) => {
    delete mockLocalStorage[key]
  })
})

describe('weatherService - Tide Data', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    fetch.mockClear()
    getHaversineDistance.mockClear()
    require('@/lib/locationUtils').getHaversineDistanceOptimized.mockClear()
    mockLocalStorage = {}
  })

  const latitude = 34.0522
  const longitude = -118.2437

  // Mock station data from the NOAA metadata API
  const mockStations = {
    stations: [
      { id: '1', name: 'Far Station', lat: 40.0, lng: -125.0 },
      { id: '2', name: 'Closest Station', lat: 34.1, lng: -118.3 }, // This will be the closest
      { id: '3', name: 'Medium Station', lat: 35.0, lng: -120.0 },
    ],
  }

  // Mock tide prediction data for the closest station
  const mockTidePredictions = {
    predictions: [{ t: '2025-11-17 12:00', v: '3.5' }],
  }

  test('fetches station list, finds closest station, and returns tide data', async () => {
    // Simulate finding the closest station (return different distances)
    require('@/lib/locationUtils').getHaversineDistanceOptimized.mockReturnValueOnce(100).mockReturnValueOnce(10).mockReturnValueOnce(50)

    // Mock the API calls
    fetch
      // First call for the station list
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockStations,
      })
      // Second call for the tide predictions
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockTidePredictions,
      })

    const tideData = await getTideData(latitude, longitude)

    expect(tideData).toEqual(mockTidePredictions)
    // Expect the station list to be cached
    expect(localStorage.setItem).toHaveBeenCalledWith('tideStations', expect.any(String))
    // Expect haversine to be called for each station
    expect(require('@/lib/locationUtils').getHaversineDistanceOptimized).toHaveBeenCalledTimes(3)
  })

  test('uses cached station list if available and not expired', async () => {
    // Pre-populate the cache with the station list
    const cachedData = {
      timestamp: Date.now(),
      stations: mockStations.stations,
    }
    localStorage.setItem('tideStations', JSON.stringify(cachedData))

    require('@/lib/locationUtils').getHaversineDistanceOptimized.mockReturnValueOnce(100).mockReturnValueOnce(10).mockReturnValueOnce(50)

    // Only mock the tide prediction API call, as the station list should not be fetched
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTidePredictions,
    })

    const tideData = await getTideData(latitude, longitude)

    expect(tideData).toEqual(mockTidePredictions)
    // fetch should have only been called once (for the tide data)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(require('@/lib/locationUtils').getHaversineDistanceOptimized).toHaveBeenCalledTimes(3)
  })

  test('fetches new station list if cache is expired', async () => {
    // Pre-populate the cache with an expired timestamp
    const expiredTimestamp = Date.now() - 8 * 24 * 60 * 60 * 1000 // 8 days ago
    const cachedData = {
      timestamp: expiredTimestamp,
      stations: mockStations.stations,
    }
    localStorage.setItem('tideStations', JSON.stringify(cachedData))

    require('@/lib/locationUtils').getHaversineDistanceOptimized.mockReturnValueOnce(100).mockReturnValueOnce(10).mockReturnValueOnce(50)

    // Mock both API calls, as the station list needs to be re-fetched
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockStations })
      .mockResolvedValueOnce({ ok: true, json: async () => mockTidePredictions })

    await getTideData(latitude, longitude)

    expect(localStorage.removeItem).toHaveBeenCalledWith('tideStations')
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  test('throws error if fetching station list fails', async () => {
    // Mock the first fetch call to return a non-ok response
    fetch.mockResolvedValueOnce({
      ok: false,
      statusText: 'Not Found',
    })

    await expect(getTideData(latitude, longitude)).rejects.toThrow('Failed to fetch NOAA tide station list.')

    // fetch should have only been called once
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  test('throws an error if coordinates are invalid', async () => {
    await expect(getTideData(91, -118.2437)).rejects.toThrow('Invalid coordinates provided.')
    await expect(getTideData(34.0522, -181)).rejects.toThrow('Invalid coordinates provided.')
    await expect(getTideData(null, -118.2437)).rejects.toThrow('Invalid coordinates provided.')
  })
})
