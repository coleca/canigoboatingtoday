/**
 * A collection of utility functions for parsing data from forecast strings.
 */

const WAVE_RANGE_REGEX = /(?:seas|waves)\s+(?:around\s+|building to\s+|subsiding to\s+|occasionally to\s+)?(\d+(?:\.\d+)?)\s*(?:to|-)\s*(\d+(?:\.\d+)?)\s*(?:foot|feet|ft)/i
const SINGLE_WAVE_REGEX = /(?:seas|waves)\s+(?:around\s+|near\s+|building to\s+|subsiding to\s+|occasionally to\s+)?(\d+(?:\.\d+)?)\s*(?:foot|feet|ft)/i
const LESS_THAN_WAVE_REGEX = /(?:seas|waves)\s+(?:around\s+)?less than\s+(\d+(?:\.\d+)?)\s*(?:foot|feet|ft)/i

/**
 * Parses the wave height from a detailed forecast string from the NWS API.
 * This function looks for patterns like "seas around X feet" or "waves X to Y feet".
 *
 * @param {string} forecastString The detailed forecast string.
 * @returns {string} The extracted wave height (e.g., "2 ft", "3 to 5 ft"), or "N/A" if not found.
 */
export function parseWaveHeight(forecastString) {
  if (!forecastString) return 'N/A'

  const rangeMatch = forecastString.match(WAVE_RANGE_REGEX)
  if (rangeMatch) {
    return `${rangeMatch[1]} to ${rangeMatch[2]} ft`
  }

  const lessThanMatch = forecastString.match(LESS_THAN_WAVE_REGEX)
  if (lessThanMatch) {
    return `Under ${lessThanMatch[1]} ft`
  }

  const singleMatch = forecastString.match(SINGLE_WAVE_REGEX)
  if (singleMatch) {
    return `${singleMatch[1]} ft`
  }

  return 'N/A'
}

export function parseWaveHeightValue(forecastString) {
  if (!forecastString) return null

  const rangeMatch = forecastString.match(WAVE_RANGE_REGEX)
  if (rangeMatch) {
    const low = Number(rangeMatch[1])
    const high = Number(rangeMatch[2])
    if (!Number.isNaN(low) && !Number.isNaN(high)) {
      return Number(((low + high) / 2).toFixed(1))
    }
  }

  const lessThanMatch = forecastString.match(LESS_THAN_WAVE_REGEX)
  if (lessThanMatch) {
    const value = Number(lessThanMatch[1])
    if (!Number.isNaN(value)) {
      return Math.max(0.5, Number((value - 0.5).toFixed(1)))
    }
  }

  const singleMatch = forecastString.match(SINGLE_WAVE_REGEX)
  if (!singleMatch) return null

  const low = Number(singleMatch[1])
  if (Number.isNaN(low)) return null

  return low
}
