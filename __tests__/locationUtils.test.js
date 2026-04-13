import { getHaversineDistance, isValidCoordinate, getHaversineDistanceOptimized, deg2rad } from '@/lib/locationUtils'

describe('locationUtils', () => {
  describe('isValidCoordinate', () => {
    test('should return true for valid coordinates', () => {
      expect(isValidCoordinate(34.0522, -118.2437)).toBe(true)
      expect(isValidCoordinate(0, 0)).toBe(true)
      expect(isValidCoordinate(90, 180)).toBe(true)
      expect(isValidCoordinate(-90, -180)).toBe(true)
    })

    test('should return false for invalid latitude', () => {
      expect(isValidCoordinate(91, 0)).toBe(false)
      expect(isValidCoordinate(-91, 0)).toBe(false)
      expect(isValidCoordinate(NaN, 0)).toBe(false)
      expect(isValidCoordinate(Infinity, 0)).toBe(false)
      expect(isValidCoordinate('34', 0)).toBe(false)
      expect(isValidCoordinate(null, 0)).toBe(false)
    })

    test('should return false for invalid longitude', () => {
      expect(isValidCoordinate(0, 181)).toBe(false)
      expect(isValidCoordinate(0, -181)).toBe(false)
      expect(isValidCoordinate(0, NaN)).toBe(false)
      expect(isValidCoordinate(0, Infinity)).toBe(false)
      expect(isValidCoordinate(0, ' -118')).toBe(false)
      expect(isValidCoordinate(0, undefined)).toBe(false)
    })
  })

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

  describe('getHaversineDistanceOptimized', () => {
    test('should return the same result as getHaversineDistance', () => {
      const lat1 = 34.0522
      const lon1 = -118.2437
      const lat2 = 37.7749
      const lon2 = -122.4194

      const standardDistance = getHaversineDistance(lat1, lon1, lat2, lon2)

      const lat1Rad = deg2rad(lat1)
      const lon1Rad = deg2rad(lon1)
      const cosLat1 = Math.cos(lat1Rad)
      const optimizedDistance = getHaversineDistanceOptimized(lat1Rad, lon1Rad, cosLat1, lat2, lon2)

      expect(optimizedDistance).toBeCloseTo(standardDistance, 10)
    })
  })
})
