/* eslint-disable @next/next/no-img-element */
'use client'

import React from 'react'

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

  const radarLoopUrl = getRadarLoopUrl(radarStation)
  const radarStillUrl = getRadarStillUrl(radarStation)

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
            Official NWS radar loop from station {radarStation.toUpperCase()}.
          </p>
        </div>
        <a
          href={`https://radar.weather.gov/station/${radarStation.toLowerCase()}/standard`}
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
          alt={`Animated weather radar loop for station ${radarStation.toUpperCase()}`}
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
