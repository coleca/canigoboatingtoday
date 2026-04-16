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
    <div className="h-full rounded-[12px] border border-white/15 bg-white/10 p-5 text-left text-white shadow-[0_8px_32px_0_rgba(31,38,135,0.18)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">Wave Forecast</h2>
        <span className="rounded-full bg-black/25 px-3 py-1 text-sm font-semibold">
          {waveHeight}
        </span>
      </div>
      <p className="text-lg sm:text-xl">
        <span className="font-semibold">Current Wave Height:</span> {waveHeight}
      </p>
    </div>
  )
}
