'use client'

import { useEffect, useState } from 'react'
import { getNWSForecast, getTideData, searchLocation } from '@/lib/weatherService'
import TideChart from './TideChart'
import WaveForecast from './WaveForecast'
import DynamicRadarMap from './DynamicRadarMap'

const DEFAULT_LOCATION_QUERY = 'Annapolis, MD'
const LAST_LOCATION_KEY = 'lastBoatingLocation'

export default function WeatherDashboard() {
  const [location, setLocation] = useState(null)
  const [locationName, setLocationName] = useState('')
  const [locationQuery, setLocationQuery] = useState('')
  const [weatherData, setWeatherData] = useState(null)
  const [tideData, setTideData] = useState({ predictions: [], station: null })
  const [loading, setLoading] = useState(true)
  const [tideLoading, setTideLoading] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOffline(!navigator.onLine)
    }

    updateOnlineStatus()
    requestCurrentLocation()

    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
  }, [])

  const loadForecastAndTides = async (latitude, longitude, label = 'Current location') => {
    setLocation({ latitude, longitude })
    setLocationName(label)
    setLoading(true)
    setTideLoading(false)
    setError(null)
    setNotice(null)

    try {
      const forecast = await getNWSForecast(latitude, longitude)
      setWeatherData(forecast)
      persistLastLocation(latitude, longitude, label)

      if (forecast._fromCache) {
        setNotice('Showing the most recently cached NOAA forecast because the live service was unavailable.')
      }

      setLoading(false)
      setTideLoading(true)

      const tides = await getTideData(latitude, longitude)
      setTideData(tides ?? { predictions: [], station: null })

      if (tides?.error) {
        setNotice((existingNotice) => existingNotice ?? 'Forecast loaded. Tide data is unavailable right now.')
      }
    } catch (err) {
      setLoading(false)
      setWeatherData(null)
      setTideData({ predictions: [], station: null })
      setError(`Failed to fetch data: ${err.message || 'Forecast unavailable.'}`)
    } finally {
      setTideLoading(false)
    }
  }

  const requestCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLoading(false)
      setError('Geolocation is not supported by this browser. Search for a U.S. location instead.')
      return
    }

    setLoading(true)
    setError(null)
    setNotice('Using your current location for the forecast.')

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        loadForecastAndTides(coords.latitude, coords.longitude, 'Current location')
      },
      async () => {
        try {
          const savedLocation = getLastLocation()
          if (savedLocation) {
            setNotice('Location access was unavailable, so we loaded your most recent boating area. You can still search below.')
            await loadForecastAndTides(savedLocation.latitude, savedLocation.longitude, savedLocation.name)
            return
          }

          const fallback = await searchLocation(DEFAULT_LOCATION_QUERY)
          setNotice('Location access was unavailable, so we loaded a fallback boating area. You can still search below.')
          await loadForecastAndTides(fallback.latitude, fallback.longitude, fallback.name)
        } catch {
          setLoading(false)
          setError('Location access was denied. Search for a U.S. location to continue.')
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 300000,
      }
    )
  }

  const handleLocationSearch = async (event) => {
    event.preventDefault()

    try {
      setError(null)
      setNotice(null)
      const result = await searchLocation(locationQuery)
      await loadForecastAndTides(result.latitude, result.longitude, result.name)
    } catch (searchError) {
      setLoading(false)
      setError(searchError.message)
    }
  }

  const currentForecast = weatherData?.periods?.[0]

  return (
    <div className="w-full max-w-6xl space-y-6">
      <section className="overflow-hidden rounded-[32px] border border-white/20 bg-white/72 p-6 shadow-[0_25px_90px_rgba(15,23,42,0.18)] backdrop-blur-xl md:p-8">
        <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-4 py-1 text-sm font-semibold uppercase tracking-[0.22em] text-sky-700">
              NOAA boating dashboard
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl font-black leading-[0.95] tracking-[-0.05em] text-slate-950 md:text-6xl">
                Can I go boating today?
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
                Fast U.S. boating guidance built from National Weather Service forecasts, NOAA tide predictions, and live radar.
              </p>
            </div>
          </div>

          <div className="grid gap-3 rounded-[24px] border border-slate-200/80 bg-slate-950 p-5 text-white shadow-lg md:min-w-[280px]">
            <p className="text-sm uppercase tracking-[0.18em] text-sky-200">Active location</p>
            <p className="text-2xl font-bold">{locationName || 'Finding your location...'}</p>
            {location && (
              <div className="space-y-1 text-sm text-slate-300">
                <p>Latitude: {location.latitude.toFixed(4)}</p>
                <p>Longitude: {location.longitude.toFixed(4)}</p>
              </div>
            )}
          </div>
        </div>

        <form className="grid gap-3 lg:grid-cols-[1fr_auto_auto]" onSubmit={handleLocationSearch}>
          <input
            type="text"
            value={locationQuery}
            onChange={(event) => setLocationQuery(event.target.value)}
            placeholder="Enter a U.S. city, state, or ZIP code"
            className="min-w-0 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-slate-900 shadow-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
          />
          <button
            type="submit"
            className="rounded-2xl bg-sky-700 px-5 py-4 font-semibold text-white shadow-sm transition hover:bg-sky-800"
          >
            Search location
          </button>
          <button
            type="button"
            onClick={requestCurrentLocation}
            className="rounded-2xl border border-slate-300 bg-slate-50 px-5 py-4 font-semibold text-slate-800 transition hover:bg-slate-100"
          >
            Use my location
          </button>
        </form>

        <div className="mt-5 grid gap-3">
          {isOffline && (
            <div className="rounded-2xl border border-slate-300 bg-slate-100 px-4 py-3 text-slate-800">
              You appear to be offline. We&apos;ll use cached forecast data if it&apos;s available.
            </div>
          )}
          {notice && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
              {notice}
            </div>
          )}
          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-800">
              Error: {error}
            </div>
          )}
          {loading && (
            <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sky-900">
              Loading forecast data...
            </div>
          )}
        </div>
      </section>

      {!loading && currentForecast && (
        <div className="grid gap-6">
          <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[28px] border border-white/25 bg-gradient-to-br from-slate-950 via-sky-950 to-sky-800 p-7 text-white shadow-[0_25px_80px_rgba(3,7,18,0.35)]">
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.22em] text-sky-200">
                Current Conditions
              </p>
              <div className="space-y-4">
                <h2 className="text-3xl font-bold">Current Conditions</h2>
                <p className="text-base font-semibold text-sky-100">{currentForecast.name}:</p>
                <p className="text-lg leading-8 text-slate-100">{currentForecast.detailedForecast}</p>
              </div>
            </div>

            <div className="grid gap-4 rounded-[28px] border border-white/20 bg-white/70 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.14)] backdrop-blur">
              <div className="grid gap-2">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">Status</p>
                <p className="text-2xl font-bold text-slate-900">
                  {error ? 'Forecast unavailable' : 'Forecast loaded'}
                </p>
              </div>
              <div className="grid gap-2 text-slate-600">
                <p>Defaults to your current location whenever your browser allows it.</p>
                <p>Tide data loads after the forecast so the page becomes usable faster.</p>
                {tideLoading && <p className="font-medium text-sky-700">Loading tide data in the background...</p>}
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
            <WaveForecast forecast={currentForecast.detailedForecast} />
            <TideChart tideData={tideData} tideLoading={tideLoading} />
          </section>

          <DynamicRadarMap location={location} />
        </div>
      )}
    </div>
  )
}

function persistLastLocation(latitude, longitude, name) {
  try {
    localStorage.setItem(LAST_LOCATION_KEY, JSON.stringify({
      latitude,
      longitude,
      name,
    }))
  } catch (error) {
    console.error('Could not write last location cache:', error)
  }
}

function getLastLocation() {
  try {
    const value = localStorage.getItem(LAST_LOCATION_KEY)
    return value ? JSON.parse(value) : null
  } catch (error) {
    console.error('Could not read last location cache:', error)
    return null
  }
}
