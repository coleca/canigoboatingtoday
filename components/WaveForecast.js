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
    <div className="p-4 border rounded-lg bg-white shadow-md">
      <h2 className="text-2xl font-semibold mb-4">Wave Forecast</h2>
      <p className="text-xl">
        <span className="font-semibold">Current Wave Height:</span> {waveHeight}
      </p>
    </div>
  )
}
