/**
 * Calculates the great-circle distance between two points on the earth
 * using the Haversine formula.
 * @param {number} lat1 Latitude of the first point.
 * @param {number} lon1 Longitude of the first point.
 * @param {number} lat2 Latitude of the second point.
 * @param {number} lon2 Longitude of the second point.
 * @returns {number} The distance in kilometers.
 */
/**
 * Validates whether the given latitude and longitude are valid coordinates.
 * @param {number} latitude
 * @param {number} longitude
 * @returns {boolean} True if valid, false otherwise.
 */
export function isValidCoordinate(latitude, longitude) {
  return (
    typeof latitude === 'number' &&
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    typeof longitude === 'number' &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180
  )
}

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

/**
 * An optimized version of the Haversine distance calculation that accepts pre-calculated
 * radian and cosine values for the first point.
 *
 * @param {number} lat1Rad Latitude of the first point in radians.
 * @param {number} lon1Rad Longitude of the first point in radians.
 * @param {number} cosLat1 Cosine of the latitude of the first point.
 * @param {number} lat2 Latitude of the second point in degrees.
 * @param {number} lon2 Longitude of the second point in degrees.
 * @returns {number} The distance in kilometers.
 */
export function getHaversineDistanceOptimized(lat1Rad, lon1Rad, cosLat1, lat2, lon2) {
  const R = 6371 // Radius of the Earth in kilometers
  const lat2Rad = deg2rad(lat2)
  const lon2Rad = deg2rad(lon2)
  const dLat = lat2Rad - lat1Rad
  const dLon = lon2Rad - lon1Rad

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    cosLat1 * Math.cos(lat2Rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export function deg2rad(deg) {
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
