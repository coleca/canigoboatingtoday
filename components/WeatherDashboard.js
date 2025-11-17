'use client'

import { useState, useEffect } from 'react'
import { getNWSForecast, getTideData } from '@/lib/weatherService'
import TideChart from './TideChart'
import WaveForecast from './WaveForecast'
import DynamicRadarMap from './DynamicRadarMap'

export default function WeatherDashboard() {
  const [location, setLocation] = useState(null)
  const [weatherData, setWeatherData] = useState(null)
  const [tideData, setTideData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    // Check the initial online status
    if (!navigator.onLine) {
      setIsOffline(true)
      setLoading(false)
      return
    }

    const fetchData = async (latitude, longitude) => {
      try {
        setLoading(true)
        const [forecast, tides] = await Promise.all([
          getNWSForecast(latitude, longitude),
          getTideData(latitude, longitude),
        ])
        setWeatherData(forecast)
        setTideData(tides)
      } catch (err) {
        setError(`Failed to fetch data: ${err.message}`)
      } finally {
        setLoading(false)
      }
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          setLocation({ latitude, longitude })
          fetchData(latitude, longitude)
        },
        (err) => {
          setError(`Error getting location: ${err.message}`)
          setLoading(false)
        }
      )
    } else {
      setError('Geolocation is not supported by this browser.')
      setLoading(false)
    }
  }, [])

  if (isOffline) {
    return <div className="text-center p-8 text-xl">You are offline. Please check your internet connection.</div>
  }

  if (loading) {
    return <div className="text-center p-8">Loading forecast data...</div>
  }

  if (error) {
    return <div className="text-center p-8 text-red-500">Error: {error}</div>
  }

  if (location && weatherData && tideData) {
    const currentForecast = weatherData.periods[0]

    return (
      <div className="p-4 w-full max-w-4xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-center mb-6">Boating Forecast</h1>
          <div className="text-center">
            <p className="text-lg">Your Location:</p>
            <p className="text-xl font-semibold">
              Latitude: {location.latitude.toFixed(4)}, Longitude: {location.longitude.toFixed(4)}
            </p>
          </div>
        </div>

        <div className="p-6 border rounded-lg bg-white shadow-md">
          <h2 className="text-2xl font-semibold mb-4">Current Conditions</h2>
          <p className="text-lg"><span className="font-semibold">{currentForecast.name}:</span> {currentForecast.detailedForecast}</p>
        </div>

        <WaveForecast forecast={currentForecast.detailedForecast} />

        <div className="p-4 border rounded-lg bg-white shadow-md">
          <TideChart tideData={tideData} />
        </div>

        <DynamicRadarMap location={location} />
      </div>
    )
  }

  return <div className="text-center p-8">Requesting your location...</div>
}
