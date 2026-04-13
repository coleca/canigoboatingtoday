// A centralized module for all external weather-related API calls.
import { getHaversineDistance, isValidCoordinate } from './locationUtils'

import { getHaversineDistance } from './locationUtils'

// The NWS API requires a unique User-Agent header for all requests.
// This helps them identify the application making the request.
const NWS_USER_AGENT = `CanIGoBoatingToday/1.0 (canigoboatingtoday.com, hello@canigoboatingtoday.com)`

import { getHaversineDistance, isValidCoordinate } from './locationUtils'

/**
 * Fetches the weather forecast from the National Weather Service (NWS) API.
 * The NWS API requires two steps:
 * 1. Fetch the gridpoint metadata for a given latitude and longitude.
 * 2. Use the gridpoint URL from the metadata to fetch the actual forecast.
 *
 * @param {number} latitude The latitude for the forecast.
 * @param {number} longitude The longitude for the forecast.
 * @returns {Promise<object>} A promise that resolves to the NWS forecast data.
 * @throws {Error} If the API request fails at any step.
 */
export async function getNWSForecast(latitude, longitude) {
  if (!isValidCoordinate(latitude, longitude)) {
    throw new Error('Invalid coordinates provided.')
  }

  try {
    // Step 1: Get the gridpoint metadata
    const pointsUrl = `https://api.weather.gov/points/${encodeURIComponent(latitude)},${encodeURIComponent(longitude)}`
    const pointsResponse = await fetch(pointsUrl, {
      headers: { 'User-Agent': NWS_USER_AGENT },
    })

    if (!pointsResponse.ok) {
      throw new Error(`NWS points API request failed: ${pointsResponse.statusText}`)
    }

    const pointsData = await pointsResponse.json()
    const forecastUrl = pointsData.properties.forecast

    if (!forecastUrl) {
      throw new Error('Could not retrieve forecast URL from NWS points data.')
    }

    // Step 2: Get the actual forecast using the gridpoint URL
    const forecastResponse = await fetch(forecastUrl, {
      headers: { 'User-Agent': NWS_USER_AGENT },
    })

    if (!forecastResponse.ok) {
      throw new Error(`NWS forecast API request failed: ${forecastResponse.statusText}`)
    }

    const forecastData = await forecastResponse.json()
    return forecastData.properties
  } catch (error) {
    console.error('Error fetching NWS forecast:', error)
    // Re-throw the error to be handled by the calling component
    throw error
  }
}

import { getHaversineDistance, getHaversineDistanceOptimized, deg2rad } from './locationUtils'

const TIDE_STATIONS_CACHE_KEY = 'tideStations'
const CACHE_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // Cache for 7 days

/**
 * Fetches tide prediction data for the nearest station to the given coordinates.
 * It uses a client-side cache for the list of tide stations to improve performance.
 *
 * @param {number} latitude The user's latitude.
 * @param {number} longitude The user's longitude.
 * @returns {Promise<object>} A promise that resolves to the tide prediction data.
 */
export async function getTideData(latitude, longitude) {
  if (!isValidCoordinate(latitude, longitude)) {
    throw new Error('Invalid coordinates provided.')
  }

  try {
    const closestStation = await findClosestTideStation(latitude, longitude)

    if (!closestStation) {
      throw new Error('Could not find a nearby tide station.')
    }

    // Get today's date in the required format (YYYYMMDD)
    const today = new Date()
    const dateString = `${today.getFullYear()}${(today.getMonth() + 1)
      .toString()
      .padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`

    // Fetch the tide predictions for the closest station
    const tideAPIUrl = `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?begin_date=${dateString}&end_date=${dateString}&station=${closestStation.id}&product=predictions&datum=MLLW&time_zone=lst_ldt&units=english&format=json`
    const tideResponse = await fetch(tideAPIUrl)
    if (!tideResponse.ok) {
      throw new Error(`NOAA tide data API request failed: ${tideResponse.statusText}`)
    }

    const tideData = await tideResponse.json()
    return tideData
  } catch (error) {
    console.error('Error fetching tide data:', error)
    throw error
  }
}

/**
 * Finds the closest tide station to a given set of coordinates.
 * Manages caching of the station list in localStorage.
 *
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<object>} The closest station object.
 */
async function findClosestTideStation(latitude, longitude) {
  const cachedStations = getCachedTideStations()

  let stations = cachedStations

  if (!stations) {
    const response = await fetch('https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json?type=tidepredictions')
    if (!response.ok) {
      throw new Error('Failed to fetch NOAA tide station list.')
    }
    const data = await response.json()
    stations = data.stations
    cacheTideStations(stations)
  }

  // Find the station with the minimum distance
  let closestStation = null
  let minDistance = Infinity

  // Pre-calculate values for the Haversine formula to optimize the loop
  const latRad = deg2rad(latitude)
  const lonRad = deg2rad(longitude)
  const cosLat = Math.cos(latRad)

  for (const station of stations) {
    const distance = getHaversineDistanceOptimized(latRad, lonRad, cosLat, station.lat, station.lng)
    if (distance < minDistance) {
      minDistance = distance
      closestStation = station
    }
  }

  return closestStation
}

function getCachedTideStations() {
  if (typeof window === 'undefined') return null

  try {
    const cachedItem = localStorage.getItem(TIDE_STATIONS_CACHE_KEY)
    if (!cachedItem) return null

    const { timestamp, stations } = JSON.parse(cachedItem)
    if (Date.now() - timestamp > CACHE_DURATION_MS) {
      // Cache is expired
      localStorage.removeItem(TIDE_STATIONS_CACHE_KEY)
      return null
    }

    return stations
  } catch (error) {
    console.error('Could not read tide station cache:', error)
    return null
  }
}

function cacheTideStations(stations) {
  if (typeof window === 'undefined') return

  try {
    const itemToCache = {
      timestamp: Date.now(),
      stations: stations,
    }
    localStorage.setItem(TIDE_STATIONS_CACHE_KEY, JSON.stringify(itemToCache))
  } catch (error) {
    console.error('Could not write to tide station cache:', error)
  }
}
