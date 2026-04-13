/**
 * Calculates the great-circle distance between two points on the earth
 * using the Haversine formula.
 * @param {number} lat1 Latitude of the first point.
 * @param {number} lon1 Longitude of the first point.
 * @param {number} lat2 Latitude of the second point.
 * @param {number} lon2 Longitude of the second point.
 * @returns {number} The distance in kilometers.
 */
export function getHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371 // Radius of the Earth in kilometers
  const dLat = deg2rad(lat2 - lat1)
  const dLon = deg2rad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function deg2rad(deg) {
  return deg * (Math.PI / 180)
}

/**
 * Validates that the given latitude and longitude are valid numeric coordinates.
 * Latitude must be between -90 and 90.
 * Longitude must be between -180 and 180.
 * @param {any} latitude
 * @param {any} longitude
 * @returns {boolean}
 */
export function isValidCoordinate(latitude, longitude) {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return false
  }

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return false
  }

  if (latitude < -90 || latitude > 90) {
    return false
  }

  if (longitude < -180 || longitude > 180) {
    return false
  }

  return true
}
