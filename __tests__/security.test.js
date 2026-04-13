import { getNWSForecast, getTideData } from '@/lib/weatherService'
import { isValidCoordinate } from '@/lib/locationUtils'

describe('Security - Coordinate Validation', () => {
  describe('isValidCoordinate', () => {
    test('returns true for valid coordinates', () => {
      expect(isValidCoordinate(34.0522, -118.2437)).toBe(true)
      expect(isValidCoordinate(-90, -180)).toBe(true)
      expect(isValidCoordinate(90, 180)).toBe(true)
      expect(isValidCoordinate(0, 0)).toBe(true)
    })

    test('returns false for latitude out of range', () => {
      expect(isValidCoordinate(-90.1, 0)).toBe(false)
      expect(isValidCoordinate(90.1, 0)).toBe(false)
    })

    test('returns false for longitude out of range', () => {
      expect(isValidCoordinate(0, -180.1)).toBe(false)
      expect(isValidCoordinate(0, 180.1)).toBe(false)
    })

    test('returns false for non-numeric values', () => {
      expect(isValidCoordinate('34.0522', -118.2437)).toBe(false)
      expect(isValidCoordinate(34.0522, '-118.2437')).toBe(false)
      expect(isValidCoordinate(null, -118.2437)).toBe(false)
      expect(isValidCoordinate(34.0522, undefined)).toBe(false)
      expect(isValidCoordinate({}, [])).toBe(false)
    })

    test('returns false for NaN or Infinity', () => {
      expect(isValidCoordinate(NaN, 0)).toBe(false)
      expect(isValidCoordinate(0, Infinity)).toBe(false)
      expect(isValidCoordinate(-Infinity, 0)).toBe(false)
    })
  })

  describe('Service methods throw on invalid coordinates', () => {
    const invalidCoords = [
      [91, 0],
      [0, 181],
      ['lat', 'lon'],
      [null, null],
    ]

    invalidCoords.forEach(([lat, lon]) => {
      test(`getNWSForecast throws error for lat: ${lat}, lon: ${lon}`, async () => {
        await expect(getNWSForecast(lat, lon)).rejects.toThrow('Invalid latitude or longitude provided.')
      })

      test(`getTideData throws error for lat: ${lat}, lon: ${lon}`, async () => {
        await expect(getTideData(lat, lon)).rejects.toThrow('Invalid latitude or longitude provided.')
      })
    })
  })
})
