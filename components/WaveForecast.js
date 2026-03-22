'use client'

import React from 'react'
import { parseWaveHeight } from '@/lib/forecastUtils'

/**
 * A component to display the parsed wave height from a forecast string.
 * @param {{forecast: string}} props - The component props.
 * @param {string} props.forecast - The detailed forecast string.
 */
export default function WaveForecast({ forecast }) {
  const waveHeight = parseWaveHeight(forecast)

  return (
    <div className="rounded-[28px] border border-white/25 bg-white/72 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.14)] backdrop-blur">
      <div className="mb-5 space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">Wave outlook</p>
        <h2 className="text-3xl font-bold text-slate-950">Wave Forecast</h2>
      </div>
      <div className="rounded-2xl bg-slate-950 p-5 text-white">
        <p className="text-sm uppercase tracking-[0.18em] text-sky-200">Parsed from NWS marine wording</p>
        <p className="mt-4 text-sm font-medium text-slate-300">Current Wave Height:</p>
        <p className="mt-3 text-3xl font-bold">{waveHeight}</p>
      </div>
    </div>
  )
}
