import { parseWaveHeight, parseWaveHeightValue } from '@/lib/forecastUtils'

describe('forecastUtils', () => {
  describe('parseWaveHeight', () => {
    test('should extract wave height from "seas around X feet"', () => {
      const forecast = 'Mostly sunny, with a high near 65. Seas around 2 feet.'
      expect(parseWaveHeight(forecast)).toBe('2 ft')
    })

    test('should extract wave height from "waves X to Y feet"', () => {
      const forecast = 'Sunny. Waves 3 to 5 feet.'
      expect(parseWaveHeight(forecast)).toBe('3 to 5 ft')
    })

    test('should extract wave height from "seas X to Y feet"', () => {
      const forecast = 'Partly cloudy. Seas 1 to 2 feet.'
      expect(parseWaveHeight(forecast)).toBe('1 to 2 ft')
    })

    test('should extract wave height from "waves X feet"', () => {
        const forecast = 'Clear. Waves 4 feet.'
        expect(parseWaveHeight(forecast)).toBe('4 ft')
    })

    test('should be case-insensitive', () => {
      const forecast = 'Clear. SEAS AROUND 1 FOOT.'
      // Note: The current regex only finds digits, so "one" would not be found.
      // This test is for the "SEAS AROUND" part being case-insensitive.
      const forecastWithDigit = 'Clear. SEAS AROUND 1 FOOT.'
      expect(parseWaveHeight(forecastWithDigit.replace(' 1 ', ' 1 ')))
        .toBe('1 ft')
    })

    test('should return "N/A" if no wave height is found', () => {
      const forecast = 'Mostly sunny, with a high near 65. No mention of waves.'
      expect(parseWaveHeight(forecast)).toBe('N/A')
    })

    test('should handle null or undefined input', () => {
      expect(parseWaveHeight(null)).toBe('N/A')
      expect(parseWaveHeight(undefined)).toBe('N/A')
    })
  })

  describe('parseWaveHeightValue', () => {
    test('returns a numeric height for a single wave value', () => {
      expect(parseWaveHeightValue('Mostly sunny. Seas around 2 feet.')).toBe(2)
    })

    test('returns the midpoint for a wave range', () => {
      expect(parseWaveHeightValue('Rain likely. Waves 3 to 5 feet.')).toBe(4)
    })

    test('returns null when no wave value can be parsed', () => {
      expect(parseWaveHeightValue('No marine wave detail here.')).toBe(null)
    })
  })
})
