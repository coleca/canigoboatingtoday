// A centralized module for all external weather-related API calls.
const NWS_REQUEST_HEADERS = {
  Accept: 'application/geo+json',
}
const FETCH_TIMEOUT_MS = 12000
const FORECAST_CACHE_PREFIX = 'nwsForecast'
const FORECAST_CACHE_TTL_MS = 15 * 60 * 1000

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
  const cacheKey = getForecastCacheKey(latitude, longitude)

  try {
    // Step 1: Get the gridpoint metadata
    const pointsUrl = `https://api.weather.gov/points/${latitude},${longitude}`
    const pointsResponse = await fetchWithTimeout(pointsUrl, {
      headers: NWS_REQUEST_HEADERS,
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
    const forecastResponse = await fetchWithTimeout(forecastUrl, {
      headers: NWS_REQUEST_HEADERS,
    })

    if (!forecastResponse.ok) {
      throw new Error(`NWS forecast API request failed: ${forecastResponse.statusText}`)
    }

    const forecastData = await forecastResponse.json()
    cacheForecast(cacheKey, forecastData.properties)
    return forecastData.properties
  } catch (error) {
    console.error('Error fetching NWS forecast:', error)
    const cachedForecast = getCachedForecast(cacheKey)
    if (cachedForecast) {
      return {
        ...cachedForecast,
        _fromCache: true,
      }
    }
    throw error instanceof Error
      ? error
      : new Error('Failed to fetch the live NOAA forecast. Please try again in a moment.')
  }
}

import { getHaversineDistance } from './locationUtils'

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
  try {
    const closestStation = await findClosestTideStation(latitude, longitude)

    if (!closestStation) {
      return {
        predictions: [],
        station: null,
      }
    }

    // Get today's date in the required format (YYYYMMDD)
    const today = new Date()
    const dateString = `${today.getFullYear()}${(today.getMonth() + 1)
      .toString()
      .padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`

    // Fetch the tide predictions for the closest station
    const tideAPIUrl = `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?begin_date=${dateString}&end_date=${dateString}&station=${closestStation.id}&product=predictions&datum=MLLW&time_zone=lst_ldt&units=english&format=json&interval=h`
    const tideResponse = await fetchWithTimeout(tideAPIUrl)
    if (!tideResponse.ok) {
      throw new Error(`NOAA tide data API request failed: ${tideResponse.statusText}`)
    }

    const tideData = await tideResponse.json()
    return {
      ...tideData,
      station: closestStation,
    }
  } catch (error) {
    console.error('Error fetching tide data:', error)
    return {
      predictions: [],
      station: null,
      error: error.message,
    }
  }
}

export async function searchLocation(query) {
  const trimmedQuery = query.trim()
  if (!trimmedQuery) {
    throw new Error('Enter a U.S. city, state, or ZIP code.')
  }

  const url = `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${encodeURIComponent(trimmedQuery)}&benchmark=Public_AR_Current&format=json`
  const response = await fetchWithTimeout(url, {
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Location search failed.')
  }

  const data = await response.json()
  const match = data?.result?.addressMatches?.[0]

  if (!match) {
    throw new Error('No matching U.S. location found.')
  }

  return {
    name: match.matchedAddress,
    latitude: match.coordinates.y,
    longitude: match.coordinates.x,
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
    console.log('Fetching fresh tide station list...')
    const response = await fetchWithTimeout('https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json?type=tidepredictions')
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

  for (const station of stations) {
    const distance = getHaversineDistance(latitude, longitude, station.lat, station.lng)
    if (distance < minDistance) {
      minDistance = distance
      closestStation = station
    }
  }

  return closestStation
}

function getCachedTideStations() {
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

async function fetchWithTimeout(url, options = {}, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, {
      cache: 'no-store',
      ...options,
      signal: controller.signal,
    })
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('The NOAA service timed out.')
    }
    if (error instanceof TypeError) {
      throw new Error('Failed to fetch')
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

function getForecastCacheKey(latitude, longitude) {
  return `${FORECAST_CACHE_PREFIX}:${latitude.toFixed(2)},${longitude.toFixed(2)}`
}

function getCachedForecast(cacheKey) {
  try {
    const cachedValue = localStorage.getItem(cacheKey)
    if (!cachedValue) return null

    const parsedValue = JSON.parse(cachedValue)
    if (Date.now() - parsedValue.timestamp > FORECAST_CACHE_TTL_MS) {
      localStorage.removeItem(cacheKey)
      return null
    }

    return parsedValue.data
  } catch (error) {
    console.error('Could not read forecast cache:', error)
    return null
  }
}

function cacheForecast(cacheKey, data) {
  try {
    localStorage.setItem(cacheKey, JSON.stringify({
      timestamp: Date.now(),
      data,
    }))
  } catch (error) {
    console.error('Could not write forecast cache:', error)
  }
}
