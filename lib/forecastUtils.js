/**
 * A collection of utility functions for parsing data from forecast strings.
 */

const WAVE_HEIGHT_REGEX = /(?:seas|waves) (?:around )?(\d+)(?: to (\d+))?/i

/**
 * Parses the wave height from a detailed forecast string from the NWS API.
 * This function looks for patterns like "seas around X feet" or "waves X to Y feet".
 *
 * @param {string} forecastString The detailed forecast string.
 * @returns {string} The extracted wave height (e.g., "2 ft", "3 to 5 ft"), or "N/A" if not found.
 */
export function parseWaveHeight(forecastString) {
  if (!forecastString) return 'N/A'

  const match = forecastString.match(WAVE_HEIGHT_REGEX)
  if (match) {
    if (match[2]) {
      return `${match[1]} to ${match[2]} ft`
    } else if (match[1]) {
      return `${match[1]} ft`
    }
  }

  return 'N/A'
}
