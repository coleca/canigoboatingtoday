// A centralized module for all external weather-related API calls.

import {
  isValidCoordinate,
  getHaversineDistanceOptimized,
  deg2rad,
} from "./locationUtils.js";
import { error as logError } from "./logger.js";

// The NWS API requires a unique User-Agent header for all requests.
// This helps them identify the application making the request.
const NWS_USER_AGENT = `CanIGoBoatingToday/1.0 (canigoboatingtoday.com, hello@canigoboatingtoday.com)`
const CLIENT_CACHE_VERSION = 'v5'
const FORECAST_CACHE_PREFIX = `forecast:${CLIENT_CACHE_VERSION}:`
const FAST_FORECAST_CACHE_PREFIX = `fastForecast:${CLIENT_CACHE_VERSION}:`
const POINTS_CACHE_PREFIX = `points:${CLIENT_CACHE_VERSION}:`
const TIDE_DATA_CACHE_PREFIX = `tideData:${CLIENT_CACHE_VERSION}:`
const GEOCODE_CACHE_PREFIX = `geocode:${CLIENT_CACHE_VERSION}:`
const ALERTS_CACHE_PREFIX = `alerts:${CLIENT_CACHE_VERSION}:`
const SUPPLEMENT_CACHE_PREFIX = `supplement:${CLIENT_CACHE_VERSION}:`
const POINTS_CACHE_DURATION_MS = 30 * 60 * 1000
const FORECAST_CACHE_DURATION_MS = 10 * 60 * 1000
const TIDE_DATA_CACHE_DURATION_MS = 30 * 60 * 1000
const GEOCODE_CACHE_DURATION_MS = 24 * 60 * 60 * 1000
const ALERTS_CACHE_DURATION_MS = 5 * 60 * 1000
const SUPPLEMENT_CACHE_DURATION_MS = 30 * 60 * 1000
const DEFAULT_FETCH_TIMEOUT_MS = 8000
const FAST_FORECAST_TIMEOUT_MS = 5000
const NWS_POINTS_TIMEOUT_MS = 12000
const NWS_FORECAST_TIMEOUT_MS = 12000
const NWS_GRID_DATA_TIMEOUT_MS = 5000
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
const OPEN_METEO_WEATHER_CODE_LABELS = {
  0: 'Sunny',
  1: 'Mostly Sunny',
  2: 'Partly Sunny',
  3: 'Cloudy',
  45: 'Foggy',
  48: 'Foggy',
  51: 'Light Drizzle',
  53: 'Drizzle',
  55: 'Heavy Drizzle',
  56: 'Freezing Drizzle',
  57: 'Freezing Drizzle',
  61: 'Light Rain',
  63: 'Rain',
  65: 'Heavy Rain',
  66: 'Freezing Rain',
  67: 'Freezing Rain',
  71: 'Light Snow',
  73: 'Snow',
  75: 'Heavy Snow',
  77: 'Snow',
  80: 'Rain Showers',
  81: 'Rain Showers',
  82: 'Heavy Rain Showers',
  85: 'Snow Showers',
  86: 'Heavy Snow Showers',
  95: 'Thunderstorms',
  96: 'Thunderstorms',
  99: 'Severe Thunderstorms',
}

function buildCoordinateCacheKey(prefix, latitude, longitude) {
  return `${prefix}${latitude.toFixed(2)},${longitude.toFixed(2)}`
}

async function fetchJsonWithTimeout(url, options = {}, timeoutMs = DEFAULT_FETCH_TIMEOUT_MS) {
  const controller = typeof AbortController === 'undefined' ? null : new AbortController()
  const timeoutId = controller
    ? setTimeout(() => controller.abort(), timeoutMs)
    : null

  try {
    const response = await fetch(url, {
      ...options,
      ...(controller ? { signal: controller.signal } : {}),
    })
    return response
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error(`Request timed out after ${Math.round(timeoutMs / 1000)} seconds.`)
    }

    throw error
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  }
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
  const pointsResponse = await fetchJsonWithTimeout(pointsUrl, {
    headers: NWS_HEADERS,
  }, NWS_POINTS_TIMEOUT_MS)

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

  const forecastResponsePromise = fetchJsonWithTimeout(
    forecastUrl,
    { headers: NWS_HEADERS },
    NWS_FORECAST_TIMEOUT_MS
  )
  const gridDataPromise = gridDataUrl
    ? fetchJsonWithTimeout(
        gridDataUrl,
        { headers: NWS_HEADERS },
        NWS_GRID_DATA_TIMEOUT_MS
      )
        .then(async (response) => {
          if (!response.ok) return null
          const data = await response.json()
          return data?.properties ?? null
        })
        .catch((error) => {
          logError("NWS grid data request failed:", error)
          return null
        })
    : Promise.resolve(null)

  const forecastResponse = await forecastResponsePromise

  if (!forecastResponse.ok) {
    const error = new Error(
      `NWS forecast API request failed: ${forecastResponse.statusText}`,
    )
    error.status = forecastResponse.status
    throw error
  }

  const forecastData = await forecastResponse.json()
  const gridData = await gridDataPromise

  return {
    ...forecastData.properties,
    gridData,
    radarStation: pointsData.properties?.radarStation ?? null,
  }
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

function createHourlySeriesByDate(times = [], values = [], transform = (value) => value, { fillToNext = false } = {}) {
  const result = {}
  const ensureDateBucket = (dateKey) => {
    if (!result[dateKey]) {
      result[dateKey] = new Array(24).fill(null)
    }
  }
  const getNextDateKey = (dateKey) => {
    const nextDate = new Date(`${dateKey}T00:00:00`)
    nextDate.setDate(nextDate.getDate() + 1)
    return nextDate.toISOString().slice(0, 10)
  }
  const parsedEntries = times
    .map((timeValue, index) => {
      if (typeof timeValue !== 'string') return null

      const rawValue = values[index]
      const dateKey = timeValue.slice(0, 10)
      const hour = Number.parseInt(timeValue.slice(11, 13), 10)

      if (!dateKey || !Number.isInteger(hour) || hour < 0 || hour > 23 || rawValue === null || rawValue === undefined) {
        return null
      }

      return {
        dateKey,
        hour,
        rawValue,
      }
    })
    .filter(Boolean)

  parsedEntries.forEach((entry, index) => {
    ensureDateBucket(entry.dateKey)

    const transformedValue = transform(entry.rawValue)
    result[entry.dateKey][entry.hour] = transformedValue

    if (!fillToNext) {
      return
    }

    const nextEntry = parsedEntries[index + 1] ?? null
    if (!nextEntry) {
      for (let fillHour = entry.hour + 1; fillHour < 24; fillHour += 1) {
        result[entry.dateKey][fillHour] = transformedValue
      }
      return
    }

    let fillDateKey = entry.dateKey
    let fillHour = entry.hour + 1

    while (
      fillDateKey < nextEntry.dateKey ||
      (fillDateKey === nextEntry.dateKey && fillHour < nextEntry.hour)
    ) {
      if (fillHour === 24) {
        fillDateKey = getNextDateKey(fillDateKey)
        fillHour = 0
      }

      ensureDateBucket(fillDateKey)
      result[fillDateKey][fillHour] = transformedValue
      fillHour += 1
    }
  })

  return result
}

function createDailyValueByDate(dailyData = {}, propertyName, transform = (value) => value) {
  const dates = dailyData.time ?? []
  const values = dailyData[propertyName] ?? []

  return dates.reduce((result, dateKey, index) => {
    const rawValue = values[index]
    result[dateKey] = rawValue === null || rawValue === undefined ? null : transform(rawValue)
    return result
  }, {})
}

function createWeatherHourlyByDate(hourlyData = {}) {
  const temperatureByDate = createHourlySeriesByDate(
    hourlyData.time,
    hourlyData.temperature_2m,
    (value) => Math.round(value * 9/5 + 32),
    { fillToNext: true }
  )
  const windByDate = createHourlySeriesByDate(
    hourlyData.time,
    hourlyData.wind_speed_10m,
    (value) => Math.round(value * 0.621371),
    { fillToNext: true }
  )
  const precipByDate = createHourlySeriesByDate(
    hourlyData.time,
    hourlyData.precipitation_probability,
    (value) => value,
    { fillToNext: true }
  )

  return Object.keys({
    ...temperatureByDate,
    ...windByDate,
    ...precipByDate,
  }).reduce((result, dateKey) => {
    result[dateKey] = {
      temp: temperatureByDate[dateKey] ?? new Array(24).fill(null),
      wind: windByDate[dateKey] ?? new Array(24).fill(null),
      precip: precipByDate[dateKey] ?? new Array(24).fill(null),
    }
    return result
  }, {})
}

function createSunTimesByDate(dailyData = {}) {
  const dates = dailyData.time ?? []
  const sunrises = dailyData.sunrise ?? []
  const sunsets = dailyData.sunset ?? []

  return dates.reduce((result, dateKey, index) => {
    result[dateKey] = {
      sunrise: sunrises[index] ?? null,
      sunset: sunsets[index] ?? null,
    }
    return result
  }, {})
}

function getOpenMeteoShortForecast(weatherCode, precipitationProbability, windSpeed) {
  if (precipitationProbability !== null && precipitationProbability !== undefined && precipitationProbability >= 65) {
    return weatherCode >= 95 ? 'Thunderstorms' : 'Rain Likely'
  }

  if (windSpeed !== null && windSpeed !== undefined && windSpeed >= 32) {
    return 'Breezy'
  }

  return OPEN_METEO_WEATHER_CODE_LABELS[weatherCode] ?? 'Partly Sunny'
}

function getOpenMeteoNightShortForecast(dayShortForecast) {
  if (!dayShortForecast) return 'Mostly Clear'
  if (dayShortForecast.includes('Thunder')) return dayShortForecast
  if (dayShortForecast.includes('Rain') || dayShortForecast.includes('Drizzle')) return dayShortForecast
  if (dayShortForecast.includes('Snow')) return dayShortForecast
  if (dayShortForecast.includes('Fog')) return dayShortForecast
  if (dayShortForecast.includes('Sunny')) return 'Mostly Clear'
  return dayShortForecast
}

function buildDetailedForecast(shortForecast, temperature, windSpeed, precipitationProbability) {
  const details = []

  if (temperature !== null && temperature !== undefined) {
    details.push(`High near ${Math.round(temperature)}.`)
  }
  if (windSpeed !== null && windSpeed !== undefined) {
    details.push(`Wind up to ${Math.round(windSpeed * 0.621371)} mph.`)
  }
  if (precipitationProbability !== null && precipitationProbability !== undefined && precipitationProbability > 15) {
    details.push(`Chance of rain ${Math.round(precipitationProbability)}%.`)
  }

  return [shortForecast, ...details].join(' ')
}

function buildOvernightForecast(shortForecast, lowTemperature) {
  if (lowTemperature === null || lowTemperature === undefined) {
    return shortForecast
  }

  return `${shortForecast}. Low around ${Math.round(lowTemperature)}.`
}

function createGridSeriesFromHourly(times = [], values = []) {
  return times.reduce((result, timeValue, index) => {
    const value = values[index]
    if (typeof timeValue !== 'string' || value === null || value === undefined) {
      return result
    }

    result.push({
      validTime: `${timeValue}/PT1H`,
      value,
    })
    return result
  }, [])
}

function getDateKeyForTimeZone(dateInput, timeZone) {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    const parts = formatter.formatToParts(new Date(dateInput))
    const year = parts.find((part) => part.type === 'year')?.value
    const month = parts.find((part) => part.type === 'month')?.value
    const day = parts.find((part) => part.type === 'day')?.value

    if (year && month && day) {
      return `${year}-${month}-${day}`
    }
  } catch {
    // Fall back to the browser-local date below.
  }

  return new Date(dateInput).toISOString().slice(0, 10)
}

function buildFastForecastFromOpenMeteo(data = {}) {
  const daily = data.daily ?? {}
  const hourly = data.hourly ?? {}
  const dates = daily.time ?? []
  const todayDateKey = getDateKeyForTimeZone(Date.now(), data.timezone ?? undefined)
  const futureOrCurrentDates = dates.filter((dateKey) => dateKey >= todayDateKey)
  const datesToRender = futureOrCurrentDates.length > 0 ? futureOrCurrentDates : dates

  const periods = datesToRender.flatMap((dateKey) => {
    const index = dates.indexOf(dateKey)
    const dayShortForecast = getOpenMeteoShortForecast(
      daily.weather_code?.[index],
      daily.precipitation_probability_max?.[index] ?? null,
      daily.wind_speed_10m_max?.[index] ?? null
    )
    const nightShortForecast = getOpenMeteoNightShortForecast(dayShortForecast)
    const weekdayLabel = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date(`${dateKey}T12:00:00`))
    const temperatureMax = daily.temperature_2m_max?.[index] ?? null
    const temperatureMin = daily.temperature_2m_min?.[index] ?? null

    return [
      {
        name: weekdayLabel,
        isDaytime: true,
        temperature: temperatureMax !== null && temperatureMax !== undefined ? Math.round(temperatureMax * 9/5 + 32) : null,
        temperatureUnit: 'F',
        shortForecast: dayShortForecast,
        detailedForecast: buildDetailedForecast(
          dayShortForecast,
          temperatureMax !== null && temperatureMax !== undefined ? temperatureMax * 9/5 + 32 : null,
          daily.wind_speed_10m_max?.[index] ?? null,
          daily.precipitation_probability_max?.[index] ?? null
        ),
        startTime: `${dateKey}T06:00:00`,
      },
      {
        name: `${weekdayLabel} Night`,
        isDaytime: false,
        temperature: temperatureMin !== null && temperatureMin !== undefined ? Math.round(temperatureMin * 9/5 + 32) : null,
        temperatureUnit: 'F',
        shortForecast: nightShortForecast,
        detailedForecast: buildOvernightForecast(
          nightShortForecast,
          temperatureMin !== null && temperatureMin !== undefined ? temperatureMin * 9/5 + 32 : null
        ),
        startTime: `${dateKey}T18:00:00`,
      },
    ]
  })

  return {
    periods,
    gridData: {
      temperature: {
        values: createGridSeriesFromHourly(hourly.time, hourly.temperature_2m),
      },
      windSpeed: {
        values: createGridSeriesFromHourly(hourly.time, hourly.wind_speed_10m),
      },
      probabilityOfPrecipitation: {
        values: createGridSeriesFromHourly(hourly.time, hourly.precipitation_probability),
      },
      waveHeight: {
        values: [],
      },
    },
    radarStation: null,
  }
}

async function getFastForecast(latitude, longitude) {
  const cacheKey = buildCoordinateCacheKey(FAST_FORECAST_CACHE_PREFIX, latitude, longitude)
  const cachedForecast = getCachedApiPayload(cacheKey, FORECAST_CACHE_DURATION_MS)
  if (cachedForecast) {
    return cachedForecast
  }

  const response = await fetchJsonWithTimeout(
    `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max&hourly=temperature_2m,wind_speed_10m,precipitation_probability&forecast_days=7&past_days=1&timezone=auto`,
    {},
    FAST_FORECAST_TIMEOUT_MS
  )

  if (!response.ok) {
    throw new Error(`Fast forecast API request failed: ${response.statusText}`)
  }

  const data = await response.json()
  const forecast = buildFastForecastFromOpenMeteo(data)
  cacheApiPayload(cacheKey, forecast)
  return forecast
}

function unwrapForecastError(error) {
  if (error instanceof AggregateError && Array.isArray(error.errors) && error.errors.length > 0) {
    return error.errors[0]
  }

  return error
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

  const response = await fetchJsonWithTimeout(
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

    const nwsForecastPromise = loadForecastForCoordinates(latitude, longitude)
      .then((result) => {
        cacheApiPayload(cacheKey, result)
        return { source: 'nws', forecast: result }
      })

    const fastForecastPromise = getFastForecast(latitude, longitude).then((result) => ({
      source: 'fast',
      forecast: result,
    }))

    const { source, forecast } = await Promise.any([
      nwsForecastPromise,
      fastForecastPromise,
    ])

    cacheApiPayload(cacheKey, forecast)

    if (source === 'fast') {
      void nwsForecastPromise.catch(() => null)
    }

    return forecast
  } catch (error) {
    const resolvedError = unwrapForecastError(error)
    logError("Error fetching NWS forecast:", resolvedError);
    // Re-throw the error to be handled by the calling component
    throw resolvedError;
  }
}

export async function getBoatingSupplement(latitude, longitude) {
  if (!isValidCoordinate(latitude, longitude)) {
    throw new Error("Invalid latitude or longitude provided.");
  }

  try {
    const cacheKey = buildCoordinateCacheKey(SUPPLEMENT_CACHE_PREFIX, latitude, longitude)
    const cachedSupplement = getCachedApiPayload(cacheKey, SUPPLEMENT_CACHE_DURATION_MS)
    if (cachedSupplement) {
      return cachedSupplement
    }

    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}&daily=sunrise,sunset&hourly=temperature_2m,wind_speed_10m,precipitation_probability&forecast_days=7&past_days=1&timezone=auto`
    const marineUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}&hourly=wave_height&daily=wave_height_max&forecast_days=7&timezone=auto&cell_selection=sea`

    const [weatherResponse, marineResponse] = await Promise.all([
      fetchJsonWithTimeout(weatherUrl),
      fetchJsonWithTimeout(marineUrl),
    ])

    if (!weatherResponse.ok) {
      throw new Error(`Astronomy API request failed: ${weatherResponse.statusText}`)
    }

    if (!marineResponse.ok) {
      throw new Error(`Marine API request failed: ${marineResponse.statusText}`)
    }

    const weatherData = await weatherResponse.json()
    const marineData = await marineResponse.json()

    const result = {
      sunTimesByDate: createSunTimesByDate(weatherData.daily),
      weatherHourlyByDate: createWeatherHourlyByDate(weatherData.hourly),
      marineWaveByDate: createHourlySeriesByDate(
        marineData.hourly?.time,
        marineData.hourly?.wave_height,
        (value) => Number((value * 3.28084).toFixed(1)),
        { fillToNext: true }
      ),
      marineWaveMaxByDate: createDailyValueByDate(
        marineData.daily,
        'wave_height_max',
        (value) => Number((value * 3.28084).toFixed(1))
      ),
    }

    cacheApiPayload(cacheKey, result)
    return result
  } catch (error) {
    logError("Error fetching boating supplement data:", error)
    throw error
  }
}

async function fetchAlertCollection(url) {
  const response = await fetchJsonWithTimeout(url, {
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
      const tideResponse = await fetchJsonWithTimeout(tideAPIUrl)

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
    const response = await fetchJsonWithTimeout('https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json?type=tidepredictions')
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
