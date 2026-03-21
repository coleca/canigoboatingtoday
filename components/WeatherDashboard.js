'use client'

import { useEffect, useState } from 'react'
import { getNWSForecast, getTideData, searchLocation } from '@/lib/weatherService'
import TideChart from './TideChart'
import WaveForecast from './WaveForecast'
import DynamicRadarMap from './DynamicRadarMap'

const DEFAULT_LOCATION_QUERY = 'Annapolis, MD'

export default function WeatherDashboard() {
  const [location, setLocation] = useState(null)
  const [weatherData, setWeatherData] = useState(null)
  const [tideData, setTideData] = useState({ predictions: [], station: null })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isOffline, setIsOffline] = useState(false)
  const [locationQuery, setLocationQuery] = useState('')
  const [locationName, setLocationName] = useState('')

  useEffect(() => {
    if (!navigator.onLine) {
      setIsOffline(true)
      setLoading(false)
      return
    }

    requestCurrentLocation()
  }, [])

  const fetchData = async (latitude, longitude, label = '') => {
    try {
      setLoading(true)
      setError(null)

      const [forecast, tides] = await Promise.all([
        getNWSForecast(latitude, longitude),
        getTideData(latitude, longitude),
      ])

      setLocation({ latitude, longitude })
      setLocationName(label)
      setWeatherData(forecast)
      setTideData(tides ?? { predictions: [], station: null })
    } catch (err) {
      setError(`Failed to fetch data: ${err.message}`)
    } finally {
      setLoading(false)
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

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        fetchData(latitude, longitude, 'Current location')
      },
      async () => {
        try {
          const fallback = await searchLocation(DEFAULT_LOCATION_QUERY)
          await fetchData(fallback.latitude, fallback.longitude, fallback.name)
        } catch (fallbackError) {
          setLoading(false)
          setError('Location access was denied. Search for a U.S. location to continue.')
        }
      }
    )
  }

  const handleLocationSearch = async (event) => {
    event.preventDefault()

    try {
      setError(null)
      setLoading(true)
      const result = await searchLocation(locationQuery)
      await fetchData(result.latitude, result.longitude, result.name)
    } catch (searchError) {
      setLoading(false)
      setError(searchError.message)
    }
  }

  if (isOffline) {
    return <div className="text-center p-8 text-xl">You are offline. Please check your internet connection.</div>
  }

  const currentForecast = weatherData?.periods?.[0]

  return (
    <div className="w-full max-w-5xl space-y-6 p-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="mb-4 text-center text-4xl font-bold tracking-tight text-slate-900">
          Can I go boating today?
        </h1>
        <form className="flex flex-col gap-3 md:flex-row" onSubmit={handleLocationSearch}>
          <input
            type="text"
            value={locationQuery}
            onChange={(event) => setLocationQuery(event.target.value)}
            placeholder="Enter a U.S. city, state, or ZIP code"
            className="flex-1 rounded-xl border border-slate-300 px-4 py-3 outline-none ring-0"
          />
          <button
            type="submit"
            className="rounded-xl bg-sky-700 px-4 py-3 font-semibold text-white"
          >
            Search
          </button>
          <button
            type="button"
            onClick={requestCurrentLocation}
            className="rounded-xl border border-slate-300 px-4 py-3 font-semibold text-slate-700"
          >
            Use my location
          </button>
        </form>
        {location && (
          <div className="mt-4 text-center text-slate-700">
            <p className="text-lg font-semibold">{locationName || 'Selected location'}</p>
            <p>
              Latitude: {location.latitude.toFixed(4)}, Longitude: {location.longitude.toFixed(4)}
            </p>
          </div>
        )}
        {error && <p className="mt-4 text-center text-red-600">Error: {error}</p>}
        {loading && <p className="mt-4 text-center">Loading forecast data...</p>}
      </div>

      {!loading && currentForecast && (
        <>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-2xl font-semibold">Current Conditions</h2>
            <p className="text-lg">
              <span className="font-semibold">{currentForecast.name}:</span>{' '}
              {currentForecast.detailedForecast}
            </p>
          </div>

          <WaveForecast forecast={currentForecast.detailedForecast} />

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <TideChart tideData={tideData} />
          </div>

          <DynamicRadarMap location={location} />
        </>
      )}
    </div>
  )
}
