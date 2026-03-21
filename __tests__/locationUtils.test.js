import { getHaversineDistance } from '@/lib/locationUtils'

describe('locationUtils', () => {
  describe('getHaversineDistance', () => {
    test('should return 0 for the same coordinates', () => {
      const distance = getHaversineDistance(34.0522, -118.2437, 34.0522, -118.2437)
      expect(distance).toBe(0)
    })

    test('should correctly calculate the distance between two points', () => {
      // Coordinates for Los Angeles and San Francisco
      const laLat = 34.0522
      const laLon = -118.2437
      const sfLat = 37.7749
      const sfLon = -122.4194

      // The approximate distance is 559 km
      const expectedDistance = 559

      const distance = getHaversineDistance(laLat, laLon, sfLat, sfLon)

      // Check if the calculated distance is within a reasonable tolerance (e.g., +/- 1 km)
      expect(distance).toBeCloseTo(expectedDistance, 0)
    })
  })
})
