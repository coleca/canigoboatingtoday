'use client'

import { useEffect, useMemo, useState } from 'react'
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
  const [forecastBundle, setForecastBundle] = useState(null)
  const [tideData, setTideData] = useState({ predictions: [], station: null })
  const [loading, setLoading] = useState(true)
  const [tideLoading, setTideLoading] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [selectedDayIndex, setSelectedDayIndex] = useState(0)

  useEffect(() => {
    requestCurrentLocation()
  }, [])

  const dailyForecasts = useMemo(
    () => buildDailyForecasts(forecastBundle?.forecast?.periods ?? []),
    [forecastBundle]
  )
  const selectedDay = dailyForecasts[selectedDayIndex] ?? null
  const currentHourly = forecastBundle?.hourly?.periods?.[0]

  const loadForecastAndTides = async (latitude, longitude, label = 'Current location') => {
    setLocation({ latitude, longitude })
    setLocationName(label)
    setLoading(true)
    setTideLoading(false)
    setError(null)
    setNotice(null)

    try {
      const forecast = await getNWSForecast(latitude, longitude)
      setForecastBundle(forecast)
      setSelectedDayIndex(0)
      persistLastLocation(latitude, longitude, label)
      setLoading(false)
      setTideLoading(true)

      const tides = await getTideData(latitude, longitude)
      setTideData(tides ?? { predictions: [], station: null })

      if (tides?.error) {
        setNotice('Forecast loaded. Tide data is unavailable right now.')
      }
    } catch (err) {
      setForecastBundle(null)
      setTideData({ predictions: [], station: null })
      setLoading(false)
      setError(`Failed to fetch data: ${err.message || 'Forecast unavailable.'}`)
    } finally {
      setTideLoading(false)
    }
  }

  const requestCurrentLocation = () => {
    if (!navigator.geolocation) {
      fallbackToSearch()
      return
    }

    setLoading(true)
    setError(null)
    setNotice('Using your current location for the latest boating outlook.')

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        loadForecastAndTides(coords.latitude, coords.longitude, 'Current location')
      },
      async () => {
        const savedLocation = getLastLocation()
        if (savedLocation) {
          setNotice('Location access was unavailable, so we loaded your last boating location instead.')
          await loadForecastAndTides(savedLocation.latitude, savedLocation.longitude, savedLocation.name)
          return
        }

        fallbackToSearch()
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 300000,
      }
    )
  }

  const fallbackToSearch = async () => {
    try {
      const fallback = await searchLocation(DEFAULT_LOCATION_QUERY)
      setNotice('Location access was unavailable, so we loaded Annapolis as a fallback boating area.')
      await loadForecastAndTides(fallback.latitude, fallback.longitude, fallback.name)
    } catch (fallbackError) {
      setLoading(false)
      setError(fallbackError.message)
    }
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

  return (
    <div className="w-full max-w-7xl space-y-6">
      <section className="overflow-hidden rounded-[36px] border border-slate-200/70 bg-white shadow-[0_30px_120px_rgba(15,23,42,0.12)]">
        <div className="grid gap-8 px-6 py-8 md:px-10 md:py-10 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <div className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-4 py-1 text-xs font-bold uppercase tracking-[0.28em] text-sky-700">
              NOAA marine outlook
            </div>
            <div className="space-y-4">
              <h1 className="max-w-4xl text-5xl font-black leading-[0.92] tracking-[-0.06em] text-slate-950 md:text-7xl">
                Can I go boating today?
              </h1>
              <p className="max-w-3xl text-lg leading-8 text-slate-600">
                A faster boating forecast built for real trip decisions. Check your location, scan the next seven days, review tide trends, and see live radar without leaving the page.
              </p>
            </div>

            <form className="grid gap-3 lg:grid-cols-[1fr_auto_auto]" onSubmit={handleLocationSearch}>
              <input
                type="text"
                value={locationQuery}
                onChange={(event) => setLocationQuery(event.target.value)}
                placeholder="Search a U.S. city, state, harbor, or ZIP code"
                className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-slate-900 outline-none ring-0 transition focus:border-sky-500 focus:bg-white"
              />
              <button
                type="submit"
                className="rounded-2xl bg-slate-950 px-5 py-4 font-semibold text-white transition hover:bg-slate-800"
              >
                Search
              </button>
              <button
                type="button"
                onClick={requestCurrentLocation}
                className="rounded-2xl border border-slate-300 bg-white px-5 py-4 font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                Use my location
              </button>
            </form>

            <div className="grid gap-3">
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
          </div>

          <div className="rounded-[30px] bg-gradient-to-br from-slate-950 via-sky-950 to-cyan-700 p-7 text-white shadow-[0_24px_80px_rgba(15,23,42,0.38)]">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-100">Active location</p>
            <div className="mt-4 space-y-3">
              <h2 className="text-3xl font-bold md:text-4xl">{locationName || 'Finding your location...'}</h2>
              {forecastBundle?.meta?.city && (
                <p className="text-base text-sky-100">
                  {forecastBundle.meta.city}, {forecastBundle.meta.state}
                </p>
              )}
              {location && (
                <div className="grid gap-2 text-sm text-sky-100/90">
                  <p>Latitude: {location.latitude.toFixed(4)}</p>
                  <p>Longitude: {location.longitude.toFixed(4)}</p>
                </div>
              )}
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <StatCard label="Current Temp" value={formatTemperature(currentHourly)} />
              <StatCard label="Wind" value={currentHourly?.windSpeed || 'N/A'} />
              <StatCard label="Short Forecast" value={currentHourly?.shortForecast || 'Loading'} />
              <StatCard label="Alerts" value={`${forecastBundle?.alerts?.length ?? 0} active`} />
            </div>
          </div>
        </div>
      </section>

      {!loading && forecastBundle && (
        <>
          {forecastBundle.alerts?.length > 0 && (
            <section className="rounded-[32px] border border-rose-200 bg-white p-6 shadow-[0_18px_60px_rgba(244,63,94,0.10)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-rose-700">Alerts</p>
                  <h2 className="text-2xl font-bold text-slate-950">Active weather alerts for this area</h2>
                </div>
              </div>
              <div className="mt-5 grid gap-3">
                {forecastBundle.alerts.slice(0, 4).map((alert) => (
                  <div key={alert.id} className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                    <p className="font-semibold text-rose-900">{alert.properties.event}</p>
                    <p className="mt-1 text-sm leading-6 text-rose-800">
                      {truncate(alert.properties.headline || alert.properties.description, 220)}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="rounded-[32px] border border-slate-200/80 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">Seven-day outlook</p>
                <h2 className="text-3xl font-bold text-slate-950">Pick a day to inspect conditions</h2>
              </div>
              <p className="text-sm text-slate-500">Defaults to today and keeps the details inline below.</p>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {dailyForecasts.map((day, index) => (
                <button
                  key={`${day.day.name}-${index}`}
                  type="button"
                  onClick={() => setSelectedDayIndex(index)}
                  className={`rounded-[26px] border p-5 text-left transition ${
                    index === selectedDayIndex
                      ? 'border-slate-950 bg-slate-950 text-white shadow-[0_22px_50px_rgba(15,23,42,0.24)]'
                      : 'border-slate-200 bg-slate-50 text-slate-900 hover:border-sky-300 hover:bg-white'
                  }`}
                >
                  <p className={`text-xs font-bold uppercase tracking-[0.24em] ${index === selectedDayIndex ? 'text-sky-200' : 'text-sky-700'}`}>
                    {day.day.name}
                  </p>
                  <p className="mt-3 text-3xl font-black">{formatTemperature(day.day)}</p>
                  <p className={`mt-2 text-sm ${index === selectedDayIndex ? 'text-slate-200' : 'text-slate-600'}`}>
                    {day.day.shortForecast}
                  </p>
                  <div className={`mt-4 grid gap-1 text-sm ${index === selectedDayIndex ? 'text-slate-200' : 'text-slate-500'}`}>
                    <p>Day wind: {day.day.windSpeed || 'N/A'}</p>
                    <p>Night: {day.night?.shortForecast || 'No overnight period available'}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {selectedDay && (
            <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[32px] border border-slate-200/80 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">Selected day</p>
                <h2 className="mt-2 text-3xl font-bold text-slate-950">{selectedDay.day.name}</h2>
                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  <InfoPill label="Temperature" value={formatTemperature(selectedDay.day)} />
                  <InfoPill label="Wind" value={selectedDay.day.windSpeed || 'N/A'} />
                  <InfoPill label="Rain chance" value={formatRainChance(selectedDay.day.probabilityOfPrecipitation?.value)} />
                </div>
                <div className="mt-6 grid gap-4">
                  <div className="rounded-3xl bg-slate-950 p-5 text-white">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-200">Daytime</p>
                    <p className="mt-3 text-lg leading-8 text-slate-100">{selectedDay.day.detailedForecast}</p>
                  </div>
                  {selectedDay.night && (
                    <div className="rounded-3xl bg-slate-100 p-5 text-slate-900">
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-600">Overnight</p>
                      <p className="mt-3 text-lg leading-8 text-slate-700">{selectedDay.night.detailedForecast}</p>
                    </div>
                  )}
                </div>
              </div>

              <WaveForecast forecast={selectedDay.day.detailedForecast} />
            </section>
          )}

          <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <TideChart tideData={tideData} tideLoading={tideLoading} />
            <div className="rounded-[32px] border border-slate-200/80 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">Hourly outlook</p>
              <h2 className="mt-2 text-3xl font-bold text-slate-950">Next twelve hours</h2>
              <div className="mt-6 grid gap-3">
                {(forecastBundle.hourly?.periods ?? []).slice(0, 12).map((period) => (
                  <div key={period.number} className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[140px_1fr_auto_auto] md:items-center">
                    <p className="text-sm font-semibold text-slate-700">{period.startTime ? formatHour(period.startTime) : period.name}</p>
                    <p className="text-sm text-slate-600">{period.shortForecast}</p>
                    <p className="text-sm font-medium text-slate-700">{formatTemperature(period)}</p>
                    <p className="text-sm text-slate-500">{period.windSpeed || 'N/A'}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <DynamicRadarMap location={location} />
        </>
      )}
    </div>
  )
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/8 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-100">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  )
}

function InfoPill({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  )
}

function buildDailyForecasts(periods) {
  const dayPeriods = periods.filter((period) => period.isDaytime).slice(0, 7)

  return dayPeriods.map((dayPeriod) => {
    const nextIndex = periods.findIndex((period) => period.number === dayPeriod.number) + 1
    const nightPeriod = periods[nextIndex]?.isDaytime === false ? periods[nextIndex] : null
    return { day: dayPeriod, night: nightPeriod }
  })
}

function formatTemperature(period) {
  if (!period?.temperature) {
    return 'N/A'
  }

  return `${Math.round(period.temperature)}°${period.temperatureUnit || 'F'}`
}

function formatRainChance(value) {
  if (value === null || value === undefined) {
    return 'N/A'
  }

  return `${Math.round(value)}%`
}

function formatHour(value) {
  return new Date(value).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function truncate(text, maxLength) {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength).trim()}...`
}

function persistLastLocation(latitude, longitude, name) {
  try {
    localStorage.setItem(LAST_LOCATION_KEY, JSON.stringify({ latitude, longitude, name }))
  } catch {}
}

function getLastLocation() {
  try {
    const value = localStorage.getItem(LAST_LOCATION_KEY)
    return value ? JSON.parse(value) : null
  } catch {
    return null
  }
}
