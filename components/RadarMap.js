/* eslint-disable @next/next/no-img-element */
'use client'

import React from 'react'
import { getHaversineDistance } from '@/lib/locationUtils'

const RADAR_STATION_FALLBACKS = [
  { id: 'KAMX', latitude: 25.6111, longitude: -80.4128 },
  { id: 'KBYX', latitude: 24.5969, longitude: -81.7033 },
  { id: 'KMLB', latitude: 28.1133, longitude: -80.6542 },
  { id: 'KTBW', latitude: 27.7055, longitude: -82.4018 },
  { id: 'KTLH', latitude: 30.3975, longitude: -84.3289 },
  { id: 'KJAX', latitude: 30.4847, longitude: -81.7019 },
  { id: 'KEVX', latitude: 30.5647, longitude: -85.9214 },
  { id: 'KMHX', latitude: 34.7759, longitude: -76.8762 },
  { id: 'KLTX', latitude: 33.9892, longitude: -78.4292 },
  { id: 'KAKQ', latitude: 36.9838, longitude: -77.0074 },
  { id: 'KDOX', latitude: 38.8258, longitude: -75.44 },
  { id: 'KDIX', latitude: 39.9469, longitude: -74.4111 },
  { id: 'KOKX', latitude: 40.8656, longitude: -72.8644 },
  { id: 'KBOX', latitude: 41.9558, longitude: -71.1369 },
  { id: 'KGYX', latitude: 43.8914, longitude: -70.2566 },
  { id: 'KMOB', latitude: 30.6794, longitude: -88.2397 },
  { id: 'KLIX', latitude: 30.3367, longitude: -89.8256 },
  { id: 'KHGX', latitude: 29.4719, longitude: -95.0792 },
  { id: 'KCRP', latitude: 27.7842, longitude: -97.5111 },
  { id: 'KBRO', latitude: 25.9156, longitude: -97.4189 },
  { id: 'KBUF', latitude: 42.9486, longitude: -78.7369 },
  { id: 'KCLE', latitude: 41.4131, longitude: -81.86 },
  { id: 'KDTX', latitude: 42.6997, longitude: -83.4717 },
  { id: 'KAPX', latitude: 44.9072, longitude: -84.7197 },
  { id: 'KGRB', latitude: 44.4983, longitude: -88.1111 },
  { id: 'KMKX', latitude: 42.9678, longitude: -88.5506 },
  { id: 'KTYX', latitude: 43.7556, longitude: -75.68 },
  { id: 'KNKX', latitude: 32.9189, longitude: -117.0419 },
  { id: 'KSOX', latitude: 33.8178, longitude: -117.6358 },
  { id: 'KVTX', latitude: 34.4122, longitude: -119.1794 },
  { id: 'KMUX', latitude: 37.1553, longitude: -121.8986 },
  { id: 'KMFR', latitude: 42.0811, longitude: -122.7161 },
  { id: 'KRTX', latitude: 45.715, longitude: -122.9647 },
  { id: 'KLGX', latitude: 47.1169, longitude: -124.1067 },
  { id: 'KATX', latitude: 48.1947, longitude: -122.4958 },
  { id: 'PHKI', latitude: 21.8939, longitude: -159.5525 },
  { id: 'PHKM', latitude: 20.1256, longitude: -155.7781 },
  { id: 'TJUA', latitude: 18.1156, longitude: -66.0781 },
]

function resolveRadarStation(location, radarStation) {
  if (radarStation) return radarStation.toUpperCase()
  if (!location) return null

  let closestStation = null
  let closestDistance = Number.POSITIVE_INFINITY

  for (const station of RADAR_STATION_FALLBACKS) {
    const distance = getHaversineDistance(
      location.latitude,
      location.longitude,
      station.latitude,
      station.longitude
    )

    if (distance < closestDistance) {
      closestDistance = distance
      closestStation = station.id
    }
  }

  return closestStation
}

function getRadarLoopUrl(radarStation) {
  if (!radarStation) return null
  return `https://radar.weather.gov/ridge/standard/${radarStation.toUpperCase()}_loop.gif`
}

function getRadarStillUrl(radarStation) {
  if (!radarStation) return null
  return `https://radar.weather.gov/ridge/standard/${radarStation.toUpperCase()}_0.gif`
}

function RadarMap({ location, radarStation }) {
  if (!location) {
    return <div>Loading radar...</div>
  }

  const resolvedRadarStation = resolveRadarStation(location, radarStation)
  const radarLoopUrl = getRadarLoopUrl(resolvedRadarStation)
  const radarStillUrl = getRadarStillUrl(resolvedRadarStation)

  if (!radarLoopUrl) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-950/40 p-6 text-center text-white/85">
        <div>
          <h2 className="text-2xl font-semibold">Weather Radar Loop</h2>
          <p className="mt-3 max-w-md text-sm leading-6">
            Radar is not available for this location yet because the nearest NWS radar station could
            not be determined.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-slate-950/30 text-white">
      <div className="flex flex-col gap-2 border-b border-white/10 bg-slate-950/45 px-4 py-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Weather Radar Loop</h2>
          <p className="text-sm text-white/75">
            Official NWS radar loop from station {resolvedRadarStation}.
          </p>
        </div>
        <a
          href={`https://radar.weather.gov/station/${resolvedRadarStation.toLowerCase()}/standard`}
          target="_blank"
          rel="noreferrer"
          className="text-sm font-semibold text-sky-200 underline-offset-4 hover:underline"
        >
          Open full NWS radar page
        </a>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center bg-slate-950/35 p-4">
        <img
          src={radarLoopUrl}
          alt={`Animated weather radar loop for station ${resolvedRadarStation}`}
          className="h-full max-h-full w-full rounded-[14px] border border-white/10 bg-slate-950 object-contain shadow-xl"
        />
      </div>

      <div className="border-t border-white/10 px-4 py-2 text-xs text-white/65">
        Fallback still image:{' '}
        <a
          href={radarStillUrl}
          target="_blank"
          rel="noreferrer"
          className="text-sky-200 underline-offset-4 hover:underline"
        >
          latest frame
        </a>
      </div>
    </div>
  )
}

export default RadarMap
