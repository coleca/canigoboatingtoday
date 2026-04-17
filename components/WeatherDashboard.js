/* eslint-disable @next/next/no-img-element */
/* eslint-disable jsx-a11y/alt-text */
'use client'

import { useState, useEffect, useMemo } from 'react'
import { geocodeLocation, getNWSAlerts, getNWSForecast, getTideData } from '@/lib/weatherService'
import TideChart from './TideChart'
import { extractHourlyDataForDay } from '@/lib/dataTransformers'
import { WindChart, PrecipChart, TempChart, WaveChart } from './charts/HourlyCharts'
import DynamicRadarMap from './DynamicRadarMap'
import { formatWeekdayLabel, getDailyForecastCards, getLocalDateKey } from '@/lib/forecastPeriods'
import { parseWaveHeightValue } from '@/lib/forecastUtils'

const DASHBOARD_CACHE_KEY = 'weatherDashboard:lastSuccessfulState'
const DASHBOARD_CACHE_MAX_AGE_MS = 30 * 60 * 1000
const GEOLOCATION_OPTIONS = {
  enableHighAccuracy: false,
  timeout: 8000,
  maximumAge: 5 * 60 * 1000,
}
const BOATING_WINDOWS = [
  { key: 'morning', label: 'AM', startHour: 6, endHour: 11 },
  { key: 'afternoon', label: 'PM', startHour: 12, endHour: 17 },
]
const DECISION_REASONS = {
  storm: { icon: '⚡', label: 'Storm' },
  rain: { icon: '🌧', label: 'Rain' },
  wind: { icon: '💨', label: 'Wind' },
  wave: { icon: '🌊', label: 'Waves' },
}
const FORECAST_ICON_VARIANTS = {
  sun: {
    src: '/icons/sun.svg',
    filter:
      'brightness(0) saturate(100%) invert(84%) sepia(72%) saturate(1226%) hue-rotate(355deg) brightness(105%) contrast(104%) drop-shadow(0 6px 14px rgba(255, 200, 0, 0.28))',
  },
  cloudy: {
    src: '/icons/cloudy.svg',
    filter:
      'brightness(0) saturate(100%) invert(78%) sepia(9%) saturate(730%) hue-rotate(173deg) brightness(92%) contrast(90%) drop-shadow(0 6px 14px rgba(171, 196, 214, 0.24))',
  },
  rain: {
    src: '/icons/rain.svg',
    filter:
      'brightness(0) saturate(100%) invert(49%) sepia(99%) saturate(650%) hue-rotate(176deg) brightness(96%) contrast(94%) drop-shadow(0 6px 14px rgba(56, 189, 248, 0.24))',
  },
  thunderstorm: {
    src: '/icons/thunderstorm.svg',
    filter:
      'brightness(0) saturate(100%) invert(66%) sepia(87%) saturate(1355%) hue-rotate(360deg) brightness(103%) contrast(103%) drop-shadow(0 6px 14px rgba(251, 191, 36, 0.24))',
  },
  snow: {
    src: '/icons/snow.svg',
    filter:
      'brightness(0) saturate(100%) invert(86%) sepia(16%) saturate(743%) hue-rotate(165deg) brightness(102%) contrast(97%) drop-shadow(0 6px 14px rgba(191, 219, 254, 0.24))',
  },
  fog: {
    src: '/icons/fog.svg',
    filter:
      'brightness(0) saturate(100%) invert(87%) sepia(8%) saturate(322%) hue-rotate(175deg) brightness(95%) contrast(92%) drop-shadow(0 6px 14px rgba(203, 213, 225, 0.2))',
  },
}

function getForecastIconVariant(shortForecast) {
  const shortForecastLower = shortForecast.toLowerCase()

  if (shortForecastLower.includes('cloud')) return FORECAST_ICON_VARIANTS.cloudy
  if (shortForecastLower.includes('clear')) return FORECAST_ICON_VARIANTS.sun
  if (shortForecastLower.includes('sun')) return FORECAST_ICON_VARIANTS.sun
  if (shortForecastLower.includes('rain') || shortForecastLower.includes('shower')) {
    return FORECAST_ICON_VARIANTS.rain
  }
  if (shortForecastLower.includes('storm')) return FORECAST_ICON_VARIANTS.thunderstorm
  if (shortForecastLower.includes('snow')) return FORECAST_ICON_VARIANTS.snow
  if (shortForecastLower.includes('fog')) return FORECAST_ICON_VARIANTS.fog

  return FORECAST_ICON_VARIANTS.sun
}

function getAlertAccentClasses(severity) {
  switch (severity) {
    case 'Extreme':
      return 'border-red-300/80 bg-red-500/20 text-red-50'
    case 'Severe':
      return 'border-orange-300/80 bg-orange-500/20 text-orange-50'
    case 'Moderate':
      return 'border-amber-300/80 bg-amber-500/20 text-amber-50'
    case 'Minor':
      return 'border-sky-300/80 bg-sky-500/20 text-sky-50'
    default:
      return 'border-white/20 bg-white/10 text-white'
  }
}

function formatAlertTime(dateValue) {
  if (!dateValue) return null

  const parsedDate = new Date(dateValue)
  if (Number.isNaN(parsedDate.getTime())) return null

  return parsedDate.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function getAlertSummary(properties = {}) {
  if (properties.headline) return properties.headline
  if (!properties.description) return 'Marine conditions may be hazardous in this area.'

  const [firstParagraph] = properties.description.split('\n')
  return firstParagraph.trim()
}

function getHourlyBlockValues(series, startHour, endHour) {
  if (!Array.isArray(series)) return []

  return series
    .slice(startHour, endHour + 1)
    .filter((value) => value !== null && value !== undefined)
}

function getTextBasedDecisionReason(detailedForecast = '') {
  const forecastText = detailedForecast.toLowerCase()

  if (/thunder|storm/.test(forecastText)) return DECISION_REASONS.storm
  if (/showers|rain|precipitation/.test(forecastText)) return DECISION_REASONS.rain
  if (/gusts as high as ([2-9]\d)|wind ([1-9]\d|[2-9]\d)/.test(forecastText)) {
    return DECISION_REASONS.wind
  }

  const waveValue = parseWaveHeightValue(detailedForecast)
  if (waveValue !== null && waveValue >= 3.5) return DECISION_REASONS.wave

  return null
}

function getDayDecision(hourlyData, detailedForecast, startHour, endHour) {
  const windValues = getHourlyBlockValues(hourlyData?.wind, startHour, endHour)
  const precipValues = getHourlyBlockValues(hourlyData?.precip, startHour, endHour)
  const waveValues = getHourlyBlockValues(hourlyData?.wave, startHour, endHour)

  const maxWind = windValues.length > 0 ? Math.max(...windValues) : null
  const maxPrecip = precipValues.length > 0 ? Math.max(...precipValues) : null
  const maxWave = waveValues.length > 0 ? Math.max(...waveValues) : null

  let reason = null

  if (maxPrecip !== null && maxPrecip >= 35) {
    reason = DECISION_REASONS.rain
  } else if (maxWind !== null && maxWind >= 15) {
    reason = DECISION_REASONS.wind
  } else if (maxWave !== null && maxWave >= 3.5) {
    reason = DECISION_REASONS.wave
  } else {
    reason = getTextBasedDecisionReason(detailedForecast)
  }

  if (reason) {
    return {
      verdict: 'caution',
      symbol: '👎',
      reason,
    }
  }

  return {
    verdict: 'go',
    symbol: '👍',
    reason: null,
  }
}

function getGeolocationErrorMessage(error) {
  if (!error) {
    return 'Unable to get your current location.'
  }

  if (error.code === 3) {
    return 'Location lookup timed out. Enter a location or try again.'
  }

  if (error.code === 1) {
    return 'Location permission was denied.'
  }

  return 'Unable to get your current location.'
}

function formatSunTime(dateInput) {
  if (!dateInput) return '--'

  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(dateInput))
}

function getSunWindowTimes(dayPeriod, nightPeriod) {
  return {
    sunrise: formatSunTime(dayPeriod?.startTime),
    sunset: formatSunTime(nightPeriod?.startTime),
  }
}

export default function WeatherDashboard() {
  const [location, setLocation] = useState(null)
  const [weatherData, setWeatherData] = useState(null)
  const [tideData, setTideData] = useState(null)
  const [alertsData, setAlertsData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isOffline, setIsOffline] = useState(false)
  const [locationName, setLocationName] = useState('')
  const [locationInput, setLocationInput] = useState('')
  const [selectedDayIndex, setSelectedDayIndex] = useState(0)
  const [tideStatus, setTideStatus] = useState('idle')
  const [alertsStatus, setAlertsStatus] = useState('idle')
  const [activeChartHour, setActiveChartHour] = useState(null)
  const [shouldLoadRadar, setShouldLoadRadar] = useState(false)

  const clearActiveChartHour = () => {
    setActiveChartHour(null)
  }

  const requestCurrentLocation = (onSuccess, onError) => {
    navigator.geolocation.getCurrentPosition(onSuccess, onError, GEOLOCATION_OPTIONS)
  }

  const loadCurrentLocation = () => {
    if (!navigator.geolocation) {
      return
    }

    setError(null)
    setLoading(true)

    requestCurrentLocation(
      (position) => {
        const { latitude, longitude } = position.coords
        const resolvedLocationName = `Latitude: ${latitude.toFixed(4)}, Longitude: ${longitude.toFixed(4)}`
        setLocation({ latitude, longitude })
        setLocationName(resolvedLocationName)
        fetchData(latitude, longitude, resolvedLocationName)
      },
      (locationError) => {
        setError(getGeolocationErrorMessage(locationError))
        setLoading(false)
      }
    )
  }

  const getHourlyValueForHour = (series) => {
    if (activeChartHour === null || activeChartHour === undefined) return null
    if (!series) return null
    const value = series[activeChartHour]
    return value === null || value === undefined ? null : value
  }

  const activeTideValue = useMemo(() => {
    if (activeChartHour === null || activeChartHour === undefined || !tideData?.predictions?.length) return null

    let closestPrediction = null
    let closestHourDiff = Number.POSITIVE_INFINITY

    for (const prediction of tideData.predictions) {
      const predictionHour = new Date(prediction.t.replace(' ', 'T')).getHours()
      const hourDiff = Math.abs(predictionHour - activeChartHour)
      if (hourDiff < closestHourDiff) {
        closestHourDiff = hourDiff
        closestPrediction = prediction
      }
    }

    return closestPrediction?.v ?? null
  }, [activeChartHour, tideData?.predictions])

  const activeOverlayLeft = useMemo(() => {
    if (activeChartHour === null || activeChartHour === undefined) return null

    const position = (activeChartHour / 23) * 100
    return Math.min(92, Math.max(8, position))
  }, [activeChartHour])

  useEffect(() => {
    const cachedDashboard = getCachedDashboardState()
    if (cachedDashboard) {
      setLocation(cachedDashboard.location ?? null)
      setWeatherData(cachedDashboard.weatherData ?? null)
      setTideData(cachedDashboard.tideData ?? null)
      setLocationName(cachedDashboard.locationName ?? '')
      setTideStatus(cachedDashboard.tideStatus ?? 'idle')
      setLoading(false)
    }

    if (!navigator.onLine) {
      setIsOffline(true)
      return
    }

    if (navigator.geolocation) {
      requestCurrentLocation(
        (position) => {
          const { latitude, longitude } = position.coords
          setLocation({ latitude, longitude })
          setLocationName(`Latitude: ${latitude.toFixed(4)}, Longitude: ${longitude.toFixed(4)}`)
          fetchData(latitude, longitude, `Latitude: ${latitude.toFixed(4)}, Longitude: ${longitude.toFixed(4)}`)
        },
        () => {
          // Default to New York if geolocation fails
          const defaultLat = 40.7128
          const defaultLon = -74.0060
          setLocation({ latitude: defaultLat, longitude: defaultLon })
          setLocationName(`New York`)
          fetchData(defaultLat, defaultLon, 'New York')
        }
      )
    } else {
      const defaultLat = 40.7128
      const defaultLon = -74.0060
      setLocation({ latitude: defaultLat, longitude: defaultLon })
      setLocationName(`New York`)
      fetchData(defaultLat, defaultLon, 'New York')
    }
  }, [])

  const fetchData = async (latitude, longitude, resolvedLocationName = locationName) => {
    const previousState = {
      location,
      locationName,
      weatherData,
      tideData,
      alertsData,
      tideStatus,
      alertsStatus,
    }

    try {
      setLoading(true)
      setError(null)
      setTideStatus('loading')
      setAlertsStatus('loading')

      const forecastPromise = getNWSForecast(latitude, longitude)
      const tidePromise = getTideData(latitude, longitude).catch((tideError) => ({
        error: tideError,
      }))
      const alertsPromise = getNWSAlerts(latitude, longitude).catch((alertsError) => ({
        error: alertsError,
      }))

      const forecast = await forecastPromise
      setWeatherData(forecast)
      setSelectedDayIndex(0)
      setActiveChartHour(null)
      setLoading(false)

      const [tideResult, alertsResult] = await Promise.all([tidePromise, alertsPromise])

      if (!tideResult?.error) {
        const tides = tideResult
        setTideData(tides)
        setTideStatus('ready')
        cacheDashboardState({
          location: { latitude, longitude },
          locationName: resolvedLocationName,
          weatherData: forecast,
          tideData: tides,
          tideStatus: 'ready',
        })
      } else {
        setTideStatus('error')
        cacheDashboardState({
          location: { latitude, longitude },
          locationName: resolvedLocationName,
          weatherData: forecast,
          tideData: null,
          tideStatus: 'error',
        })
      }

      if (!alertsResult?.error) {
        setAlertsData(alertsResult)
        setAlertsStatus('ready')
      } else {
        setAlertsStatus('error')
      }
    } catch (err) {
      if (previousState.weatherData || previousState.tideData || previousState.alertsData) {
        setLocation(previousState.location)
        setLocationName(previousState.locationName)
        setWeatherData(previousState.weatherData)
        setTideData(previousState.tideData)
        setAlertsData(previousState.alertsData)
        setTideStatus(previousState.tideStatus)
        setAlertsStatus(previousState.alertsStatus)
      } else {
        setWeatherData(null)
        setTideData(null)
        setAlertsData(null)
        setTideStatus('idle')
        setAlertsStatus('idle')
      }
      setError(`Failed to fetch data: ${err.message}`)
      setLoading(false)
    }
  }

  const handleLocationSubmit = async (e) => {
    e.preventDefault()
    if (!locationInput) return

    setLoading(true)
    setError(null)

    try {
      const loc = await geocodeLocation(locationInput)
      setLocation({ latitude: loc.latitude, longitude: loc.longitude })
      setLocationName(loc.name)
      await fetchData(loc.latitude, loc.longitude, loc.name)
    } catch (err) {
      setError(err.message || 'Error geocoding location.')
      setLoading(false)
    }
  }

  const dailyCards = useMemo(() => getDailyForecastCards(weatherData?.periods ?? []), [weatherData?.periods])

  // Extract date string for selected day
  const selectedDateStr = useMemo(() => {
    if (!dailyCards[selectedDayIndex]) return null
    return dailyCards[selectedDayIndex].dateKey ?? getLocalDateKey(dailyCards[selectedDayIndex].startTime)
  }, [dailyCards, selectedDayIndex])

  const hourlyData = useMemo(() => {
    if (!weatherData?.gridData || !selectedDateStr) return null
    return extractHourlyDataForDay(weatherData.gridData, selectedDateStr)
  }, [weatherData?.gridData, selectedDateStr])

  const hourlyDataByDate = useMemo(() => {
    if (!weatherData?.gridData) return {}

    return dailyCards.reduce((result, card) => {
      result[card.dateKey] = extractHourlyDataForDay(weatherData.gridData, card.dateKey)
      return result
    }, {})
  }, [weatherData?.gridData, dailyCards])

  const waveChartData = useMemo(() => {
    if (!hourlyData) return null

    const hasWaveSeriesData = hourlyData.wave.some((value) => value !== null && value !== undefined && value > 0.1)
    if (hasWaveSeriesData) {
      return hourlyData.wave
    }

    const fallbackWaveValue = parseWaveHeightValue(dailyCards[selectedDayIndex]?.detailedForecast)
    if (fallbackWaveValue === null) {
      return hasWaveSeriesData ? hourlyData.wave : hourlyData.wave.map(() => null)
    }

    return hourlyData.wave.map(() => fallbackWaveValue)
  }, [hourlyData, dailyCards, selectedDayIndex])

  const activeHourLabel = useMemo(() => {
    if (activeChartHour === null || activeChartHour === undefined || !hourlyData?.labels) return null
    return hourlyData.labels[activeChartHour] ?? null
  }, [activeChartHour, hourlyData?.labels])

  const marineAlerts = alertsData?.alerts ?? []

  useEffect(() => {
    if (selectedDayIndex >= dailyCards.length && dailyCards.length > 0) {
      setSelectedDayIndex(0)
    }
  }, [dailyCards.length, selectedDayIndex])

  useEffect(() => {
    setActiveChartHour(null)
  }, [selectedDayIndex, locationName])

  useEffect(() => {
    if (typeof window === 'undefined' || shouldLoadRadar) return undefined

    const radarContainer = document.getElementById('radar-map-container')
    if (!radarContainer) return undefined

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldLoadRadar(true)
          observer.disconnect()
        }
      },
      { rootMargin: '300px 0px' }
    )

    observer.observe(radarContainer)
    return () => observer.disconnect()
  }, [shouldLoadRadar, location])

  if (isOffline) {
    return <div className="text-center p-8 text-xl">You are offline. Please check your internet connection.</div>
  }

  const renderChartOverlay = (valueLabel) => {
    if (!activeHourLabel || activeOverlayLeft === null) return null

    return (
      <div
        className="pointer-events-none absolute top-12 z-10 -translate-x-1/2 rounded-xl border border-white/15 bg-black/70 px-3 py-2 text-center text-xs font-semibold text-white shadow-lg backdrop-blur-md"
        style={{ left: `${activeOverlayLeft}%` }}
      >
        <div className="text-[10px] uppercase tracking-[0.12em] text-white/70">{activeHourLabel}</div>
        <div className="mt-1 whitespace-nowrap text-sm">{valueLabel}</div>
      </div>
    )
  }

  const renderChartContainer = (overlayValue, chart) => (
    <div
      className="chart-container relative h-[250px] bg-white/10 rounded-[12px] p-3"
      onMouseLeave={clearActiveChartHour}
      onTouchEnd={clearActiveChartHour}
      onTouchCancel={clearActiveChartHour}
    >
      {renderChartOverlay(overlayValue)}
      {chart}
    </div>
  )

  return (
      <div className="w-full flex flex-col items-center justify-start min-h-screen pt-2 pb-4 text-white sm:pt-4">
        {loading && (
            <div
              id="loader-overlay"
              className={`visible flex fixed left-0 w-full justify-center items-center z-[1000] transition-all ${
                weatherData ? 'top-4 h-auto bg-transparent pointer-events-none' : 'top-0 h-full bg-black/50'
              }`}
            >
                <div className={`loader border-8 border-[#f3f3f3] border-t-[#3498db] rounded-full animate-[spin_2s_linear_infinite] ${weatherData ? 'w-[36px] h-[36px]' : 'w-[60px] h-[60px]'}`}></div>
            </div>
        )}
        <div
          id="weather-alerts"
          className={`content-width w-full max-w-[1400px] px-3 sm:px-4 ${marineAlerts.length > 0 ? 'mb-5' : 'mb-0'}`}
        >
          {alertsStatus === 'ready' && marineAlerts.length > 0 && (
            <div className="rounded-[18px] border border-red-300/25 bg-red-500/10 p-4 shadow-[0_8px_32px_0_rgba(31,38,135,0.24)] backdrop-blur-[4px]">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-red-100/80">
                    NOAA / NWS Boater Alerts
                  </p>
                  <h2 className="text-xl font-semibold text-white">
                    Active marine hazards for the selected area
                  </h2>
                </div>
                <p className="text-sm text-red-100/80">
                  {marineAlerts.length} active alert{marineAlerts.length === 1 ? '' : 's'}
                </p>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {marineAlerts.map((alert) => {
                  const properties = alert.properties ?? {}
                  const expiresLabel = formatAlertTime(properties.expires)

                  return (
                    <article
                      key={alert.id}
                      className={`rounded-[16px] border p-4 shadow-lg backdrop-blur-md ${getAlertAccentClasses(properties.severity)}`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-current/25 px-2.5 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.12em]">
                          {properties.event}
                        </span>
                        {properties.severity && (
                          <span className="text-xs font-medium opacity-85">{properties.severity}</span>
                        )}
                        {properties.urgency && (
                          <span className="text-xs font-medium opacity-75">{properties.urgency}</span>
                        )}
                      </div>

                      <p className="mt-3 text-sm leading-6 text-white/90">
                        {getAlertSummary(properties)}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-3 text-xs text-white/75">
                        {expiresLabel && <span>Expires {expiresLabel}</span>}
                        {properties.areaDesc && <span>{properties.areaDesc}</span>}
                      </div>
                    </article>
                  )
                })}
              </div>
            </div>
          )}
        </div>
        <div className="title-container content-width w-full max-w-[1400px] px-3 sm:px-4 mx-auto flex items-center justify-center gap-3 sm:gap-5 mb-4 mt-5 sm:mt-8">
          <svg className="boat-icon w-[60px] h-[60px] text-white drop-shadow-md" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="currentColor">
            <path d="M20 80h60v10H20z"/>
            <path d="M30 70h40l10 10H20z"/>
            <path d="M50 20l-20 50h20z"/>
          </svg>
          <h1 className="text-[1.9em] sm:text-[2.5em] font-bold text-center" style={{textShadow: "2px 2px 4px rgba(0,0,0,0.2)"}}>Can I go boating today?</h1>
          <svg id="settings-icon" className="settings-icon w-[30px] h-[30px] cursor-pointer transition-transform hover:rotate-45 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.4 11.6c-.2-.5-.4-1-.7-1.3l1.5-1.5c.4-.4.4-1 0-1.4l-2.8-2.8c-.4-.4-1-.4-1.4 0l-1.5 1.5c-.3-.3-.8-.5-1.3-.7l-.3-2.1c-.1-.6-.6-1-1.2-1H9.4c-.6 0-1.1.4-1.2 1l-.3 2.1c-.5.2-1 .4-1.3.7l-1.5-1.5c-.4-.4-1-.4-1.4 0L1.1 8.9c-.4.4-.4 1 0 1.4l1.5 1.5c-.3.3-.5.8-.7 1.3l-2.1.3c-.6.1-1 .6-1 1.2v2.8c0 .6.4 1.1 1 1.2l2.1.3c.2.5.4 1 .7 1.3l-1.5 1.5c-.4.4-.4 1 0 1.4l2.8 2.8c.4.4 1 .4 1.4 0l1.5-1.5c.3.3.8.5 1.3.7l.3 2.1c.1.6.6 1 1.2 1h2.8c.6 0 1.1-.4 1.2-1l.3-2.1c.5-.2 1-.4 1.3-.7l1.5 1.5c.4.4 1 .4 1.4 0l2.8-2.8c-.4-.4.4-1 0-1.4l-1.5-1.5c.3-.3-.5-.8-.7-1.3l2.1-.3c.6-.1 1-.6 1-1.2v-2.8c0-.6-.4-1.1-1-1.2l-2.1-.3zM12 15.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5z"/>
          </svg>
        </div>

        <div id="location-container" className="text-center mb-5 w-full max-w-[1400px] px-3 sm:px-4">
            <form id="location-form" onSubmit={handleLocationSubmit} className="flex flex-col sm:flex-row justify-center gap-2.5 mb-2.5">
                <div className="relative w-full sm:w-[300px]">
                  <input
                    type="text"
                    id="location-input"
                    placeholder="Enter a location"
                    value={locationInput}
                    onChange={(e) => setLocationInput(e.target.value)}
                    className="w-full rounded-[20px] border border-white/50 bg-white/20 py-[10px] pl-[15px] pr-[52px] text-[1em] text-white placeholder:text-white/70"
                  />
                  <button
                    type="button"
                    aria-label="Use current location"
                    onClick={loadCurrentLocation}
                    className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M12 2v4" />
                      <path d="M12 18v4" />
                      <path d="M2 12h4" />
                      <path d="M18 12h4" />
                      <circle cx="12" cy="12" r="3" />
                      <circle cx="12" cy="12" r="8" />
                    </svg>
                  </button>
                </div>
                <button type="submit" className="p-[10px_20px] border-none rounded-[20px] bg-white text-[#005f73] text-[1em] font-semibold cursor-pointer transition-colors hover:bg-[#f0f8ff] hover:text-[#003459]">Get Weather</button>
            </form>
            <p id="current-location" className="text-[1.1em] font-light opacity-90">{locationName}</p>
        </div>

        {error && <div className="text-center p-4 text-red-200">{error}</div>}

        {weatherData && (
          <div id="weather-forecast" className="w-full max-w-[1400px] px-3 sm:px-4 mt-5 flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory lg:grid lg:grid-cols-4 xl:grid-cols-7 lg:overflow-visible">
            {dailyCards.map((card, index) => {
              const icon = getForecastIconVariant(card.shortForecast)
              const isSelected = index === selectedDayIndex
              const dayHourlyData = hourlyDataByDate[card.dateKey] ?? null
              const dayDecisions = BOATING_WINDOWS.map((window) => ({
                ...window,
                ...getDayDecision(dayHourlyData, card.detailedForecast, window.startHour, window.endHour),
              }))
              const { sunrise, sunset } = getSunWindowTimes(card.dayPeriod, card.nightPeriod)
              const temperatureUnit = card.temperatureUnit || 'F'

              return (
              <div
                  key={index}
                  className={`day-forecast min-w-[170px] sm:min-w-[190px] lg:min-w-0 flex flex-col justify-between h-full bg-white/20 border rounded-[15px] p-4 sm:p-5 text-center shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] backdrop-blur-[4px] cursor-pointer transition-all hover:-translate-y-[10px] hover:bg-white/30 snap-start ${isSelected ? 'bg-white/40 border-white/50 border-2' : 'border-white/30'}`}
                  onClick={() => setSelectedDayIndex(index)}
              >
                  <div>
                    <h2 className="m-0 mb-[15px] text-[1.5em] font-semibold">{formatWeekdayLabel(card.startTime)}</h2>
                    <img
                      src={icon.src}
                      alt={card.shortForecast}
                      className="w-[70px] h-[70px] mx-auto mb-[15px]"
                      style={{ filter: icon.filter }}
                    />
                    <div className="temp text-[1.85em] flex justify-center items-baseline gap-[10px] font-semibold">
                        <span className="max">{card.temperatureHigh ?? '--'}&deg;{temperatureUnit}</span>
                        <span className="text-white/80">/</span>
                        <span className="min text-[0.9em] text-white/85">{card.temperatureLow ?? '--'}&deg;{temperatureUnit}</span>
                    </div>
                    <div className="mt-5 grid grid-cols-2 gap-3 text-center">
                      <div className="rounded-[14px] bg-white/12 px-3 py-2">
                        <div className="text-[0.68rem] uppercase tracking-[0.18em] text-white/70">Sunrise</div>
                        <div className="mt-1 text-[1.05em] font-semibold">{sunrise}</div>
                      </div>
                      <div className="rounded-[14px] bg-white/12 px-3 py-2">
                        <div className="text-[0.68rem] uppercase tracking-[0.18em] text-white/70">Sunset</div>
                        <div className="mt-1 text-[1.05em] font-semibold">{sunset}</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5">
                    <div className="space-y-3">
                      {dayDecisions.map((decision) => (
                        <div
                          key={decision.key}
                          aria-label={
                            decision.reason
                              ? `${decision.key} no ${decision.reason.label.toLowerCase()}`
                              : `${decision.key} yes`
                          }
                          className="flex items-center justify-between text-[0.98em] font-semibold"
                        >
                          <span className="text-[0.9rem] uppercase tracking-[0.1em] text-white/90">
                            {decision.key === 'morning' ? 'MORN:' : 'AFT:'}
                          </span>
                          <span
                            className={`ml-3 min-w-[48px] text-left text-[1.25em] ${
                              decision.reason ? 'text-rose-300' : 'text-emerald-300'
                            }`}
                          >
                            {decision.reason ? 'NO' : 'YES'}
                          </span>
                          <span className="ml-3 min-w-[74px] text-right text-[0.9rem] text-white/90">
                            {decision.reason ? `${decision.reason.icon} ${decision.reason.label}` : 'Safe'}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="weather-description mt-[18px] text-center text-[1.02em] italic leading-7 opacity-95">
                      {card.shortForecast}
                    </div>
                  </div>
              </div>
            )})}
          </div>
        )}

        {weatherData && location && (
          <div id="hourly-forecast-container" className="w-full max-w-[1400px] mt-[30px] px-3 sm:px-4">
            <div className="p-[18px] sm:p-[25px] bg-white/20 rounded-[15px] shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] backdrop-blur-[4px]" style={{display: 'block'}}>
              <h2 id="hourly-forecast-day" className="text-[1.8em] text-center mb-[20px]">{dailyCards[selectedDayIndex]?.name}</h2>
              <div id="charts-container" className="mt-[20px] flex flex-col gap-[15px]">
                  {hourlyData && (
                    <>
                      {renderChartContainer(
                        getHourlyValueForHour(hourlyData.wind) !== null ? `${getHourlyValueForHour(hourlyData.wind)} mph` : 'N/A',
                        <WindChart
                          windData={hourlyData.wind}
                          labels={hourlyData.labels}
                          activeHour={activeChartHour}
                          onActiveHourChange={setActiveChartHour}
                        />
                      )}
                      {renderChartContainer(
                        getHourlyValueForHour(waveChartData) !== null ? `${getHourlyValueForHour(waveChartData)} ft` : 'N/A',
                        <WaveChart
                          waveData={waveChartData}
                          labels={hourlyData.labels}
                          activeHour={activeChartHour}
                          onActiveHourChange={setActiveChartHour}
                        />
                      )}
                      {renderChartContainer(
                        getHourlyValueForHour(hourlyData.temp) !== null ? `${getHourlyValueForHour(hourlyData.temp)}°F` : 'N/A',
                        <TempChart
                          tempData={hourlyData.temp}
                          labels={hourlyData.labels}
                          activeHour={activeChartHour}
                          onActiveHourChange={setActiveChartHour}
                        />
                      )}
                      {renderChartContainer(
                        getHourlyValueForHour(hourlyData.precip) !== null ? `${getHourlyValueForHour(hourlyData.precip)}%` : 'N/A',
                        <PrecipChart
                          precipData={hourlyData.precip}
                          labels={hourlyData.labels}
                          activeHour={activeChartHour}
                          onActiveHourChange={setActiveChartHour}
                        />
                      )}
                    </>
                  )}

                  {tideData && (
                    <div
                      className="chart-container relative h-[250px] bg-white/10 rounded-[12px] p-3"
                      onMouseLeave={clearActiveChartHour}
                      onTouchEnd={clearActiveChartHour}
                      onTouchCancel={clearActiveChartHour}
                    >
                      {renderChartOverlay(activeTideValue !== null ? `${activeTideValue} ft` : 'N/A')}
                      <TideChart
                        tideData={tideData}
                        activeHour={activeChartHour}
                        onActiveHourChange={setActiveChartHour}
                      />
                    </div>
                  )}

                  {tideStatus === 'loading' && (
                    <div className="chart-container rounded-[12px] border border-white/15 bg-white/10 p-5 text-center">
                      Loading tide chart...
                    </div>
                  )}
              </div>
            </div>
          </div>
        )}

        {location && (
          <div id="radar-map-container" className="w-full max-w-[1400px] px-3 sm:px-4 mt-[30px] mx-auto">
            <div className="rounded-[15px] overflow-hidden shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] aspect-[1/1] min-h-[420px] md:aspect-[4/3] lg:aspect-[5/4]">
              {shouldLoadRadar ? (
                <DynamicRadarMap
                  location={location}
                  radarStation={weatherData?.radarStation ?? alertsData?.locationContext?.radarStation ?? null}
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-white/10 text-center text-white/85">
                  <div>
                    <h2 className="text-2xl font-semibold">Weather Radar Loop</h2>
                    <p className="mt-3 text-sm">Radar will load as you scroll near it.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="disclaimer w-full max-w-[1400px] px-3 sm:px-4 mx-auto mt-[30px] mb-8">
          <div className="p-[15px] bg-black/20 rounded-[10px] text-center text-[0.9em]">
            <p>This application has been optimized for marine forecasting and is currently designed only for coastal areas of the United States. Boaters should use their own judgement, consult multiple sources, and abide by all local and federal maritime laws. The creators of this application are not liable for any damages or losses resulting from its use.</p>
          </div>
        </div>
      </div>
  )
}

function getCachedDashboardState() {
  if (typeof window === 'undefined') return null

  try {
    const cachedValue = localStorage.getItem(DASHBOARD_CACHE_KEY)
    if (!cachedValue) return null

    const parsed = JSON.parse(cachedValue)
    if (Date.now() - parsed.timestamp > DASHBOARD_CACHE_MAX_AGE_MS) {
      localStorage.removeItem(DASHBOARD_CACHE_KEY)
      return null
    }

    return parsed.payload
  } catch {
    return null
  }
}

function cacheDashboardState(payload) {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(
      DASHBOARD_CACHE_KEY,
      JSON.stringify({
        timestamp: Date.now(),
        payload,
      })
    )
  } catch {
    // Ignore cache write errors so the app remains interactive.
  }
}
