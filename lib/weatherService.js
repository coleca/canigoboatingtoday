// A centralized module for all external weather-related API calls.

import {
  isValidCoordinate,
  getHaversineDistanceOptimized,
  deg2rad,
} from "./locationUtils.js";
import { error as logError } from "./logger.js";
import { parseWaveHeightValue } from "./forecastUtils.js";

// The NWS API requires a unique User-Agent header for all requests.
// This helps them identify the application making the request.
const NWS_USER_AGENT = `CanIGoBoatingToday/1.0 (canigoboatingtoday.com, hello@canigoboatingtoday.com)`
const CLIENT_CACHE_VERSION = 'v2'
const FORECAST_CACHE_PREFIX = `forecast:${CLIENT_CACHE_VERSION}:`
const POINTS_CACHE_PREFIX = `points:${CLIENT_CACHE_VERSION}:`
const TIDE_DATA_CACHE_PREFIX = `tideData:${CLIENT_CACHE_VERSION}:`
const GEOCODE_CACHE_PREFIX = `geocode:${CLIENT_CACHE_VERSION}:`
const ALERTS_CACHE_PREFIX = `alerts:${CLIENT_CACHE_VERSION}:`
const POINTS_CACHE_DURATION_MS = 30 * 60 * 1000
const FORECAST_CACHE_DURATION_MS = 10 * 60 * 1000
const TIDE_DATA_CACHE_DURATION_MS = 30 * 60 * 1000
const GEOCODE_CACHE_DURATION_MS = 24 * 60 * 60 * 1000
const ALERTS_CACHE_DURATION_MS = 5 * 60 * 1000
const NWS_HEADERS = {
  "User-Agent": NWS_USER_AGENT,
}
const MARINE_EVENT_KEYWORDS = [
  'small craft',
  'gale',
  'storm warning',
  'storm watch',
  'hurricane force wind',
  'special marine',
  'marine weather',
  'hazardous seas',
  'low water advisory',
  'dense fog advisory',
  'dense smoke advisory',
  'air stagnation advisory',
  'ashfall warning',
  'freezing spray',
  'brisk wind advisory',
  'lake wind advisory',
  'tsunami',
  'coastal flood',
  'high surf',
  'rip current',
]
const MARINE_ZONE_PREFIXES = [
  'AMZ',
  'ANZ',
  'GMZ',
  'LCZ',
  'LEZ',
  'LHZ',
  'LMZ',
  'LOZ',
  'LSZ',
  'PHZ',
  'PKZ',
  'PMZ',
  'PSZ',
  'SLZ',
]

function buildCoordinateCacheKey(prefix, latitude, longitude) {
  return `${prefix}${latitude.toFixed(2)},${longitude.toFixed(2)}`
}

function clearCachedApiPayload(key, storageType = 'sessionStorage') {
  if (typeof window === "undefined") return

  try {
    window[storageType].removeItem(key)
  } catch (error) {
    logError("Could not clear API cache:", error)
  }
}

function extractZoneIdentifier(zoneUrl) {
  if (typeof zoneUrl !== 'string') return null

  const trimmedZoneUrl = zoneUrl.trim()
  if (!trimmedZoneUrl) return null

  return trimmedZoneUrl.split('/').filter(Boolean).pop() ?? null
}

async function getNWSPointMetadata(latitude, longitude, { forceRefresh = false } = {}) {
  if (!isValidCoordinate(latitude, longitude)) {
    throw new Error("Invalid latitude or longitude provided.");
  }

  const cacheKey = buildCoordinateCacheKey(POINTS_CACHE_PREFIX, latitude, longitude)
  const cachedPointMetadata = forceRefresh
    ? null
    : getCachedApiPayload(cacheKey, POINTS_CACHE_DURATION_MS)
  if (cachedPointMetadata) {
    return cachedPointMetadata
  }

  if (forceRefresh) {
    clearCachedApiPayload(cacheKey)
  }

  const pointsUrl = `https://api.weather.gov/points/${encodeURIComponent(latitude)},${encodeURIComponent(longitude)}`
  const pointsResponse = await fetch(pointsUrl, {
    headers: NWS_HEADERS,
  })

  if (!pointsResponse.ok) {
    const error = new Error(
      `NWS points API request failed: ${pointsResponse.statusText}`,
    )
    error.status = pointsResponse.status
    throw error
  }

  const pointsData = await pointsResponse.json()
  cacheApiPayload(cacheKey, pointsData)
  return pointsData
}

async function fetchForecastFromPointMetadata(pointsData) {
  const forecastUrl = pointsData.properties.forecast
  const gridDataUrl = pointsData.properties.forecastGridData

  if (!forecastUrl) {
    throw new Error("Could not retrieve forecast URL from NWS points data.")
  }

  const requests = [fetch(forecastUrl, { headers: NWS_HEADERS })]
  if (gridDataUrl) {
    requests.push(fetch(gridDataUrl, { headers: NWS_HEADERS }))
  }

  const [forecastResponse, gridDataResponse] = await Promise.all(requests)

  if (!forecastResponse.ok) {
    const error = new Error(
      `NWS forecast API request failed: ${forecastResponse.statusText}`,
    )
    error.status = forecastResponse.status
    throw error
  }

  const forecastData = await forecastResponse.json()
  const gridData = gridDataResponse?.ok ? await gridDataResponse.json() : null

  return {
    ...forecastData.properties,
    gridData: gridData ? gridData.properties : null,
    radarStation: pointsData.properties?.radarStation ?? null,
  }
}

function hasUsableWaveHeights(gridData) {
  const waveValues = gridData?.waveHeight?.values ?? []
  return waveValues.some((entry) => typeof entry?.value === 'number' && entry.value > 0)
}

function hasWaveForecastPeriods(periods = []) {
  return periods.some((period) => parseWaveHeightValue(period?.detailedForecast) !== null)
}

async function loadForecastForCoordinates(latitude, longitude) {
  let pointsData = await getNWSPointMetadata(latitude, longitude)
  let result

  try {
    result = await fetchForecastFromPointMetadata(pointsData)
  } catch (forecastError) {
    if (forecastError.status !== 404) {
      throw forecastError
    }

    const forecastCacheKey = buildCoordinateCacheKey(FORECAST_CACHE_PREFIX, latitude, longitude)
    const pointsCacheKey = buildCoordinateCacheKey(POINTS_CACHE_PREFIX, latitude, longitude)
    clearCachedApiPayload(forecastCacheKey)
    clearCachedApiPayload(pointsCacheKey)
    pointsData = await getNWSPointMetadata(latitude, longitude, { forceRefresh: true })
    result = await fetchForecastFromPointMetadata(pointsData)
  }

  return result
}

async function getMarineForecastFallback(latitude, longitude) {
  const nearbyStations = await findClosestTideStations(latitude, longitude)

  for (const station of nearbyStations) {
    const stationLatitude = Number(station.lat)
    const stationLongitude = Number(station.lng)

    if (!isValidCoordinate(stationLatitude, stationLongitude)) {
      continue
    }

    if (
      Math.abs(stationLatitude - latitude) < 0.01 &&
      Math.abs(stationLongitude - longitude) < 0.01
    ) {
      continue
    }

    try {
      const marineForecast = await loadForecastForCoordinates(stationLatitude, stationLongitude)

      if (
        hasUsableWaveHeights(marineForecast.gridData) ||
        hasWaveForecastPeriods(marineForecast.periods)
      ) {
        return marineForecast
      }
    } catch {
      // Keep trying nearby stations until one returns marine wave guidance.
    }
  }

  return null
}

export async function geocodeLocation(query) {
  const trimmedQuery = String(query ?? '').trim()
  if (!trimmedQuery) {
    throw new Error('Location query is required.')
  }

  const cacheKey = `${GEOCODE_CACHE_PREFIX}${trimmedQuery.toLowerCase()}`
  const cachedLocation = getCachedApiPayload(cacheKey, GEOCODE_CACHE_DURATION_MS, 'localStorage')
  if (cachedLocation) {
    return cachedLocation
  }

  const response = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(trimmedQuery)}&count=1&language=en&format=json`
  )
  const data = await response.json()

  if (!data.results || data.results.length === 0) {
    throw new Error('Could not find location.')
  }

  const location = data.results[0]
  cacheApiPayload(cacheKey, location, 'localStorage')
  return location
}

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
    throw new Error("Invalid latitude or longitude provided.");
  }

  try {
    const cacheKey = buildCoordinateCacheKey(FORECAST_CACHE_PREFIX, latitude, longitude)
    const cachedForecast = getCachedApiPayload(cacheKey, FORECAST_CACHE_DURATION_MS)
    if (cachedForecast) {
      return cachedForecast
    }

    let result = await loadForecastForCoordinates(latitude, longitude)

    if (!hasUsableWaveHeights(result.gridData)) {
      try {
        const marineForecast = await getMarineForecastFallback(latitude, longitude)
        if (marineForecast) {
          result = {
            ...result,
            marineGridData: marineForecast.gridData ?? null,
            marinePeriods: marineForecast.periods ?? null,
          }
        }
      } catch {
        // If the marine fallback fails, keep the primary forecast rather than failing the request.
      }
    }

    cacheApiPayload(cacheKey, result)
    return result
  } catch (error) {
    logError("Error fetching NWS forecast:", error);
    // Re-throw the error to be handled by the calling component
    throw error;
  }
}

async function fetchAlertCollection(url) {
  const response = await fetch(url, {
    headers: NWS_HEADERS,
  })

  if (!response.ok) {
    throw new Error(`NWS alerts API request failed: ${response.statusText}`)
  }

  return response.json()
}

function getSeverityRank(severity) {
  switch (severity) {
    case 'Extreme':
      return 4
    case 'Severe':
      return 3
    case 'Moderate':
      return 2
    case 'Minor':
      return 1
    default:
      return 0
  }
}

function getUrgencyRank(urgency) {
  switch (urgency) {
    case 'Immediate':
      return 4
    case 'Expected':
      return 3
    case 'Future':
      return 2
    case 'Past':
      return 1
    default:
      return 0
  }
}

function getMarineSignalText(properties = {}) {
  return [
    properties.event,
    properties.headline,
    properties.description,
    properties.instruction,
    properties.areaDesc,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function hasMarineZoneCode(properties = {}) {
  const zoneCodes = properties.geocode?.UGC ?? []
  return zoneCodes.some((zoneCode) =>
    MARINE_ZONE_PREFIXES.some((prefix) => zoneCode.startsWith(prefix))
  )
}

function isMarineAlert(feature) {
  const properties = feature?.properties ?? {}
  const marineSignalText = getMarineSignalText(properties)

  return (
    hasMarineZoneCode(properties) ||
    MARINE_EVENT_KEYWORDS.some((keyword) => marineSignalText.includes(keyword))
  )
}

function sortAlerts(alertA, alertB) {
  const severityDifference =
    getSeverityRank(alertB.properties?.severity) - getSeverityRank(alertA.properties?.severity)

  if (severityDifference !== 0) {
    return severityDifference
  }

  const urgencyDifference =
    getUrgencyRank(alertB.properties?.urgency) - getUrgencyRank(alertA.properties?.urgency)

  if (urgencyDifference !== 0) {
    return urgencyDifference
  }

  const sentATime = new Date(alertA.properties?.sent ?? 0).getTime()
  const sentBTime = new Date(alertB.properties?.sent ?? 0).getTime()

  return sentBTime - sentATime
}

function getAlertsLocationContext(pointProperties = {}) {
  const relativeLocation = pointProperties.relativeLocation?.properties

  return {
    county: extractZoneIdentifier(pointProperties.county),
    forecastZone: extractZoneIdentifier(pointProperties.forecastZone),
    forecastOffice: pointProperties.gridId ?? null,
    radarStation: pointProperties.radarStation ?? null,
    city: relativeLocation?.city ?? null,
    state: relativeLocation?.state ?? null,
  }
}

export async function getNWSAlerts(latitude, longitude) {
  if (!isValidCoordinate(latitude, longitude)) {
    throw new Error("Invalid latitude or longitude provided.");
  }

  try {
    const cacheKey = buildCoordinateCacheKey(ALERTS_CACHE_PREFIX, latitude, longitude)
    const cachedAlerts = getCachedApiPayload(cacheKey, ALERTS_CACHE_DURATION_MS)
    if (cachedAlerts) {
      return cachedAlerts
    }

    const pointData = await getNWSPointMetadata(latitude, longitude)
    const pointProperties = pointData.properties ?? {}
    const locationContext = getAlertsLocationContext(pointProperties)

    const alertQueryUrls = [
      `https://api.weather.gov/alerts/active?point=${encodeURIComponent(latitude)},${encodeURIComponent(longitude)}`,
      locationContext.county
        ? `https://api.weather.gov/alerts/active?zone=${encodeURIComponent(locationContext.county)}`
        : null,
      locationContext.forecastZone
        ? `https://api.weather.gov/alerts/active?zone=${encodeURIComponent(locationContext.forecastZone)}`
        : null,
    ].filter(Boolean)

    const alertCollections = await Promise.all(
      alertQueryUrls.map((url) => fetchAlertCollection(url))
    )

    const dedupedAlerts = new Map()

    for (const collection of alertCollections) {
      const features = collection.features ?? []
      for (const feature of features) {
        if (!feature?.id) continue
        dedupedAlerts.set(feature.id, feature)
      }
    }

    const marineAlerts = Array.from(dedupedAlerts.values())
      .filter(isMarineAlert)
      .sort(sortAlerts)

    const result = {
      alerts: marineAlerts,
      locationContext,
    }

    cacheApiPayload(cacheKey, result)
    return result
  } catch (error) {
    logError("Error fetching NWS alerts:", error)
    throw error
  }
}

const TIDE_STATIONS_CACHE_KEY = "tideStations";
const CACHE_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // Cache for 7 days

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
    throw new Error("Invalid latitude or longitude provided.");
  }

  try {
    const cacheKey = `${TIDE_DATA_CACHE_PREFIX}${latitude.toFixed(2)},${longitude.toFixed(2)}`
    const cachedTideData = getCachedApiPayload(cacheKey, TIDE_DATA_CACHE_DURATION_MS)
    if (cachedTideData) {
      return cachedTideData
    }

    const nearbyStations = await findClosestTideStations(latitude, longitude);

    if (!nearbyStations.length) {
      throw new Error("Could not find a nearby tide station.");
    }

    // Some nearby stations in the metadata list do not actually return prediction data.
    // Try the closest few in order until we find one with usable predictions.
    for (const station of nearbyStations) {
      const tideAPIUrl = `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?date=today&station=${station.id}&product=predictions&datum=MLLW&time_zone=lst_ldt&units=english&format=json&interval=h`
      const tideResponse = await fetch(tideAPIUrl)

      if (!tideResponse.ok) {
        continue
      }

      const tideData = await tideResponse.json()
      if (Array.isArray(tideData.predictions) && tideData.predictions.length > 0) {
        cacheApiPayload(cacheKey, tideData)
        return tideData
      }
    }

    throw new Error("Could not find tide predictions for nearby stations.");
  } catch (error) {
    logError("Error fetching tide data:", error);
    throw error;
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
async function findClosestTideStations(latitude, longitude) {
  const cachedStations = getCachedTideStations();

  let stations = cachedStations;

  if (!stations) {
    const response = await fetch('https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json?type=tidepredictions')
    if (!response.ok) {
      throw new Error("Failed to fetch NOAA tide station list.");
    }
    const data = await response.json();
    stations = data.stations;
    cacheTideStations(stations);
  }

  // Pre-calculate values for the Haversine formula to optimize the loop
  const latRad = deg2rad(latitude);
  const lonRad = deg2rad(longitude);
  const cosLat = Math.cos(latRad);

  return stations
    .map((station) => ({
      station,
      distance: getHaversineDistanceOptimized(
      latRad,
      lonRad,
      cosLat,
      station.lat,
      station.lng,
    ),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 5)
    .map(({ station }) => station);
}

function getCachedTideStations() {
  if (typeof window === "undefined") return null;

  try {
    const cachedItem = localStorage.getItem(TIDE_STATIONS_CACHE_KEY);
    if (!cachedItem) return null;

    const { timestamp, stations } = JSON.parse(cachedItem);
    if (Date.now() - timestamp > CACHE_DURATION_MS) {
      // Cache is expired
      localStorage.removeItem(TIDE_STATIONS_CACHE_KEY);
      return null;
    }

    return stations;
  } catch (error) {
    logError("Could not read tide station cache:", error);
    return null;
  }
}

function cacheTideStations(stations) {
  if (typeof window === "undefined") return;

  try {
    const itemToCache = {
      timestamp: Date.now(),
      stations: stations,
    };
    localStorage.setItem(TIDE_STATIONS_CACHE_KEY, JSON.stringify(itemToCache));
  } catch (error) {
    logError("Could not write to tide station cache:", error);
  }
}

function getCachedApiPayload(key, maxAgeMs, storageType = 'sessionStorage') {
  if (typeof window === "undefined") return null

  try {
    const storage = window[storageType]
    const cachedItem = storage.getItem(key)
    if (!cachedItem) return null

    const { timestamp, payload } = JSON.parse(cachedItem)
    if (Date.now() - timestamp > maxAgeMs) {
      storage.removeItem(key)
      return null
    }

    return payload
  } catch (error) {
    logError("Could not read API cache:", error)
    return null
  }
}

function cacheApiPayload(key, payload, storageType = 'sessionStorage') {
  if (typeof window === "undefined") return

  try {
    window[storageType].setItem(
      key,
      JSON.stringify({
        timestamp: Date.now(),
        payload,
      })
    )
  } catch (error) {
    logError("Could not write API cache:", error)
  }
}
