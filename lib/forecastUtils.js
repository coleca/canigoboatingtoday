/**
 * A collection of utility functions for parsing data from forecast strings.
 */

const SEAS_AROUND_REGEX = /seas around (\d+)/i
const WAVES_RANGE_REGEX = /waves (\d+) to (\d+) feet/i
const SEAS_RANGE_REGEX = /seas (\d+) to (\d+) feet/i
const WAVES_FEET_REGEX = /waves (\d+) feet/i

/**
 * Parses the wave height from a detailed forecast string from the NWS API.
 * This function looks for patterns like "seas around X feet" or "waves X to Y feet".
 *
 * @param {string} forecastString The detailed forecast string.
 * @returns {string} The extracted wave height (e.g., "2 ft", "3 to 5 ft"), or "N/A" if not found.
 */
export function parseWaveHeight(forecastString) {
  if (!forecastString) return 'N/A'

  // Look for "seas around X feet"
  let match = forecastString.match(SEAS_AROUND_REGEX)
  if (match && match[1]) {
    return `${match[1]} ft`
  }

  // Look for "waves X to Y feet"
  match = forecastString.match(WAVES_RANGE_REGEX)
  if (match && match[1] && match[2]) {
    return `${match[1]} to ${match[2]} ft`
  }

  // Look for "seas X to Y feet"
  match = forecastString.match(SEAS_RANGE_REGEX)
  if (match && match[1] && match[2]) {
    return `${match[1]} to ${match[2]} ft`
  }

  // Look for a single value "waves X feet"
  match = forecastString.match(WAVES_FEET_REGEX)
  if (match && match[1]) {
    return `${match[1]} ft`
  }

  return 'N/A'
}
