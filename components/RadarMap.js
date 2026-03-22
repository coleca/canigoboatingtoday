'use client'

import React from 'react'
import { MapContainer, TileLayer, WMSTileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

// The URL for the NOAA radar Web Map Service (WMS)
// This layer shows composite reflectivity, which is the standard radar view.
const NOAA_RADAR_URL = 'https://opengeo.ncep.noaa.gov/geoserver/MRMS/wms'

/**
 * An interactive map component that displays a base map and a NOAA weather radar overlay.
 * @param {{location: {latitude: number, longitude: number}}} props - The component props.
 */
function RadarMap({ location }) {
  if (!location) {
    return <div>Loading map...</div>
  }

  const position = [location.latitude, location.longitude]

  return (
    <div className="rounded-[28px] border border-white/25 bg-white/72 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.14)] backdrop-blur">
      <div className="mb-5 space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">Live observations</p>
        <h2 className="text-3xl font-bold text-slate-950">Weather Radar</h2>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200" style={{ height: '500px', width: '100%' }}>
        <MapContainer center={position} zoom={8} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <WMSTileLayer
            url={NOAA_RADAR_URL}
            layers="CREF" // Composite Reflectivity
            format="image/png"
            transparent={true}
            opacity={0.6}
            attribution="NOAA/NWS"
          />
        </MapContainer>
      </div>
    </div>
  )
}

export default RadarMap
