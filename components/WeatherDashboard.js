/* eslint-disable @next/next/no-img-element */
/* eslint-disable jsx-a11y/alt-text */
'use client'

import { useState, useEffect, useMemo } from 'react'
import { getNWSForecast, getTideData } from '@/lib/weatherService'
import TideChart from './TideChart'
import { extractHourlyDataForDay } from '@/lib/dataTransformers'
import { WindChart, PrecipChart, TempChart, WaveChart } from './charts/HourlyCharts'
import DynamicRadarMap from './DynamicRadarMap'
import { formatWeekdayLabel, getDailyPeriods, getLocalDateKey } from '@/lib/forecastPeriods'
import { parseWaveHeight } from '@/lib/forecastUtils'

export default function WeatherDashboard() {
  const [location, setLocation] = useState(null)
  const [weatherData, setWeatherData] = useState(null)
  const [tideData, setTideData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isOffline, setIsOffline] = useState(false)
  const [locationName, setLocationName] = useState('')
  const [locationInput, setLocationInput] = useState('')
  const [selectedDayIndex, setSelectedDayIndex] = useState(0)
  const [tideStatus, setTideStatus] = useState('idle')
  const [activeChartHour, setActiveChartHour] = useState(null)

  const clearActiveChartHour = () => {
    setActiveChartHour(null)
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
    if (!navigator.onLine) {
      setIsOffline(true)
      setLoading(false)
      return
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          setLocation({ latitude, longitude })
          setLocationName(`Latitude: ${latitude.toFixed(4)}, Longitude: ${longitude.toFixed(4)}`)
          fetchData(latitude, longitude)
        },
        () => {
          // Default to New York if geolocation fails
          const defaultLat = 40.7128
          const defaultLon = -74.0060
          setLocation({ latitude: defaultLat, longitude: defaultLon })
          setLocationName(`New York`)
          fetchData(defaultLat, defaultLon)
        }
      )
    } else {
      const defaultLat = 40.7128
      const defaultLon = -74.0060
      setLocation({ latitude: defaultLat, longitude: defaultLon })
      setLocationName(`New York`)
      fetchData(defaultLat, defaultLon)
    }
  }, [])

  const fetchData = async (latitude, longitude) => {
    try {
      setLoading(true)
      setError(null)
      setTideStatus('loading')
      setTideData(null)

      const forecastPromise = getNWSForecast(latitude, longitude)
      const tidePromise = getTideData(latitude, longitude)

      const forecast = await forecastPromise
      setWeatherData(forecast)
      setSelectedDayIndex(0)
      setActiveChartHour(null)
      setLoading(false)

      try {
        const tides = await tidePromise
        setTideData(tides)
        setTideStatus('ready')
      } catch {
        setTideStatus('error')
      }
    } catch (err) {
      setWeatherData(null)
      setTideData(null)
      setTideStatus('idle')
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
      const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(locationInput)}&count=1&language=en&format=json`)
      const data = await response.json()

      if (data.results && data.results.length > 0) {
        const loc = data.results[0]
        setLocation({ latitude: loc.latitude, longitude: loc.longitude })
        setLocationName(loc.name)
        await fetchData(loc.latitude, loc.longitude)
      } else {
        setError('Could not find location.')
        setLoading(false)
      }
    } catch {
      setError('Error geocoding location.')
      setLoading(false)
    }
  }

  const dailyPeriods = useMemo(() => getDailyPeriods(weatherData?.periods ?? []), [weatherData?.periods])

  // Extract date string for selected day
  const selectedDateStr = useMemo(() => {
    if (!dailyPeriods[selectedDayIndex]) return null
    return getLocalDateKey(dailyPeriods[selectedDayIndex].startTime)
  }, [dailyPeriods, selectedDayIndex])

  const hourlyData = useMemo(() => {
    if (!weatherData?.gridData || !selectedDateStr) return null
    return extractHourlyDataForDay(weatherData.gridData, selectedDateStr)
  }, [weatherData?.gridData, selectedDateStr])

  const activeHourLabel = useMemo(() => {
    if (activeChartHour === null || activeChartHour === undefined || !hourlyData?.labels) return null
    return hourlyData.labels[activeChartHour] ?? null
  }, [activeChartHour, hourlyData?.labels])

  useEffect(() => {
    if (selectedDayIndex >= dailyPeriods.length && dailyPeriods.length > 0) {
      setSelectedDayIndex(0)
    }
  }, [dailyPeriods.length, selectedDayIndex])

  useEffect(() => {
    setActiveChartHour(null)
  }, [selectedDayIndex, locationName])

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
        <div id="weather-alerts" className="content-width w-full max-w-[1400px] px-3 sm:px-4 mb-5"></div>
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
                <input
                  type="text"
                  id="location-input"
                  placeholder="Enter a location"
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  className="p-[10px_15px] border border-white/50 rounded-[20px] bg-white/20 text-white text-[1em] w-full sm:w-[300px] placeholder:text-white/70"
                />
                <button type="submit" className="p-[10px_20px] border-none rounded-[20px] bg-white text-[#005f73] text-[1em] font-semibold cursor-pointer transition-colors hover:bg-[#f0f8ff] hover:text-[#003459]">Get Weather</button>
            </form>
            <p id="current-location" className="text-[1.1em] font-light opacity-90">{locationName}</p>
        </div>

        {error && <div className="text-center p-4 text-red-200">{error}</div>}

        {weatherData && (
          <div id="weather-forecast" className="w-full max-w-[1400px] px-3 sm:px-4 mt-5 flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory lg:grid lg:grid-cols-4 xl:grid-cols-7 lg:overflow-visible">
            {dailyPeriods.map((period, index) => {
              let iconSrc = '/icons/sun.svg'
              const shortForecastLower = period.shortForecast.toLowerCase();
              if (shortForecastLower.includes('cloud')) iconSrc = '/icons/cloudy.svg';
              else if (shortForecastLower.includes('clear')) iconSrc = '/icons/sun.svg';
              else if (shortForecastLower.includes('sun')) iconSrc = '/icons/sun.svg';
              else if (shortForecastLower.includes('rain') || shortForecastLower.includes('shower')) iconSrc = '/icons/rain.svg';
              else if (shortForecastLower.includes('storm')) iconSrc = '/icons/thunderstorm.svg';
              else if (shortForecastLower.includes('snow')) iconSrc = '/icons/snow.svg';
              else if (shortForecastLower.includes('fog')) iconSrc = '/icons/fog.svg';

              const isSelected = index === selectedDayIndex;
              const waveSummary = parseWaveHeight(period.detailedForecast)

              return (
              <div
                  key={index}
                  className={`day-forecast min-w-[170px] sm:min-w-[190px] lg:min-w-0 flex flex-col justify-between h-full bg-white/20 border rounded-[15px] p-4 sm:p-5 text-center shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] backdrop-blur-[4px] cursor-pointer transition-all hover:-translate-y-[10px] hover:bg-white/30 snap-start ${isSelected ? 'bg-white/40 border-white/50 border-2' : 'border-white/30'}`}
                  onClick={() => setSelectedDayIndex(index)}
              >
                  <div>
                    <h2 className="m-0 mb-[15px] text-[1.5em] font-semibold">{formatWeekdayLabel(period.startTime)}</h2>
                    <img src={iconSrc} alt={period.shortForecast} className="w-[70px] h-[70px] mx-auto mb-[15px]" style={{ filter: 'invert(1)' }}/>
                    <div className="temp text-[1.2em] flex justify-center gap-[10px]">
                        <span className="max font-bold">{period.temperature}&deg;{period.temperatureUnit}</span>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex flex-wrap justify-center gap-2 text-[0.85em] font-semibold">
                      <span className="rounded-full bg-white/15 px-3 py-1">Wave {waveSummary}</span>
                      <span className="rounded-full bg-white/15 px-3 py-1">{period.shortForecast}</span>
                    </div>
                    <div className="weather-description text-center mt-[10px] text-[0.9em] italic opacity-90">
                      {period.detailedForecast}
                    </div>
                  </div>
              </div>
            )})}
          </div>
        )}

        {weatherData && location && (
          <div id="hourly-forecast-container" className="w-full max-w-[1400px] mt-[30px] px-3 sm:px-4">
            <div className="p-[18px] sm:p-[25px] bg-white/20 rounded-[15px] shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] backdrop-blur-[4px]" style={{display: 'block'}}>
              <h2 id="hourly-forecast-day" className="text-[1.8em] text-center mb-[20px]">{dailyPeriods[selectedDayIndex]?.name}</h2>
              <div id="charts-container" className="mt-[20px] flex flex-col gap-[15px]">
                  {hourlyData && (
                    <>
                      {renderChartContainer(
                        getHourlyValueForHour(hourlyData.wave) !== null ? `${getHourlyValueForHour(hourlyData.wave)} ft` : 'N/A',
                        <WaveChart
                          waveData={hourlyData.wave}
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
                      {renderChartContainer(
                        getHourlyValueForHour(hourlyData.wind) !== null ? `${getHourlyValueForHour(hourlyData.wind)} mph` : 'N/A',
                        <WindChart
                          windData={hourlyData.wind}
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
            <div className="rounded-[15px] overflow-hidden shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] h-[400px]">
              <DynamicRadarMap location={location} />
            </div>
          </div>
        )}

        <div className="disclaimer w-full max-w-[1400px] px-3 sm:px-4 mx-auto mt-[30px] mb-8">
          <div className="p-[15px] bg-black/20 rounded-[10px] text-center text-[0.9em]">
            <p>This application has been optimized for marine forecasting, but boaters should use their own judgement, consult multiple sources, and abide by all local and federal maritime laws. The creators of this application are not liable for any damages or losses resulting from its use.</p>
          </div>
        </div>
      </div>
  )
}
