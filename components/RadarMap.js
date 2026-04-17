'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

const NOAA_RADAR_TILE_URL =
  'https://nowcoast.noaa.gov/arcgis/rest/services/nowcoast/radar_meteo_imagery_nexrad_time/MapServer/tile/{z}/{y}/{x}'
const RADAR_LOOP_FRAME_COUNT = 6
const RADAR_LOOP_STEP_MINUTES = 5
const RADAR_LOOP_REFRESH_MS = 4 * 60 * 1000
const RADAR_LOOP_PLAYBACK_MS = 900

function alignTimestampToStep(timestamp, stepMinutes) {
  const stepMs = stepMinutes * 60 * 1000
  return timestamp - (timestamp % stepMs)
}

function formatRadarFrameLabel(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function buildRadarFrames(referenceTimestamp) {
  const alignedTimestamp = alignTimestampToStep(referenceTimestamp, RADAR_LOOP_STEP_MINUTES)

  return Array.from({ length: RADAR_LOOP_FRAME_COUNT }, (_, index) => {
    const frameTimestamp =
      alignedTimestamp - (RADAR_LOOP_FRAME_COUNT - index - 1) * RADAR_LOOP_STEP_MINUTES * 60 * 1000

    return {
      timestamp: frameTimestamp,
      label: formatRadarFrameLabel(frameTimestamp),
      url: `${NOAA_RADAR_TILE_URL}?blankTile=false&time=${frameTimestamp}`,
    }
  })
}

function RadarMapViewUpdater({ position }) {
  const map = useMap()

  useEffect(() => {
    map.setView(position)
  }, [map, position])

  return null
}

function RadarMap({ location }) {
  const [isPlaying, setIsPlaying] = useState(true)
  const [referenceTimestamp, setReferenceTimestamp] = useState(() => Date.now())
  const [activeFrameIndex, setActiveFrameIndex] = useState(RADAR_LOOP_FRAME_COUNT - 1)

  const frames = useMemo(() => buildRadarFrames(referenceTimestamp), [referenceTimestamp])
  const activeFrame = frames[activeFrameIndex] ?? frames[frames.length - 1]

  useEffect(() => {
    setActiveFrameIndex(frames.length - 1)
  }, [frames])

  useEffect(() => {
    const refreshTimer = window.setInterval(() => {
      setReferenceTimestamp(Date.now())
    }, RADAR_LOOP_REFRESH_MS)

    return () => window.clearInterval(refreshTimer)
  }, [])

  useEffect(() => {
    if (!isPlaying || frames.length < 2) return undefined

    const playbackTimer = window.setInterval(() => {
      setActiveFrameIndex((currentIndex) => (currentIndex + 1) % frames.length)
    }, RADAR_LOOP_PLAYBACK_MS)

    return () => window.clearInterval(playbackTimer)
  }, [frames.length, isPlaying])

  if (!location) {
    return <div>Loading map...</div>
  }

  const position = [location.latitude, location.longitude]

  return (
    <div className="flex h-full flex-col bg-slate-950/30 text-white">
      <div className="flex flex-col gap-3 border-b border-white/10 bg-slate-950/45 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Weather Radar Loop</h2>
          <p className="text-sm text-white/75">
            NOAA nowCOAST MRMS base reflectivity for the selected boating area.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPlaying((currentValue) => !currentValue)}
            className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/20"
          >
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <button
            type="button"
            onClick={() => {
              setReferenceTimestamp(Date.now())
              setActiveFrameIndex(frames.length - 1)
            }}
            className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/20"
          >
            Latest
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/75">
        <span>Frame {activeFrame?.label ?? 'Loading'}</span>
        <span>6-frame loop</span>
      </div>

      <div className="min-h-0 flex-1">
        <MapContainer center={position} zoom={8} style={{ height: '100%', width: '100%' }}>
          <RadarMapViewUpdater position={position} />
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <TileLayer
            key={activeFrame?.timestamp ?? 'latest'}
            url={activeFrame?.url}
            opacity={0.72}
            attribution="NOAA/NWS nowCOAST"
          />
        </MapContainer>
      </div>
    </div>
  )
}

export default RadarMap
