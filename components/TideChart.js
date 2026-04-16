'use client'

import React, { useMemo } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import annotationPlugin from 'chartjs-plugin-annotation'
import { getCommonOptions, getHoveredHourFromLabel } from './charts/HourlyCharts'

// Register the necessary components for Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  annotationPlugin
)

// Pre-instantiate the formatter outside the component to avoid repeated initialization
// inside the rendering loop, which significantly improves performance.
const timeFormatter = new Intl.DateTimeFormat([], {
  hour: '2-digit',
  minute: '2-digit',
})

/**
 * Renders a line chart of tide predictions.
 * @param {{tideData: object}} props - The component props.
 * @param {object} props.tideData - The raw tide prediction data from the NOAA API.
 */
export default function TideChart({ tideData, activeHour, onActiveHourChange }) {
  // The API returns an object with a 'predictions' array
  const predictions = useMemo(() => tideData?.predictions || [], [tideData?.predictions])

  // Format the data for Chart.js
  const chartData = useMemo(() => {
    const labels = []
    const data = []

    predictions.forEach((p) => {
      const numericValue = Number(p.v)
      if (Number.isNaN(numericValue)) {
        return
      }

      // Use the pre-instantiated formatter and replace space with T for ISO format
      labels.push(
        timeFormatter.format(new Date(p.t.replace(' ', 'T')))
      )
      data.push(numericValue)
    })

    return {
      labels,
      datasets: [
        {
          label: 'Tide Height (ft)',
          data,
          borderColor: 'rgba(117, 214, 255, 0.95)',
          backgroundColor: 'rgba(117, 214, 255, 0.22)',
          fill: true,
          tension: 0.35,
          pointRadius: 3,
          pointHoverRadius: 5,
          pointBackgroundColor: 'rgba(190, 240, 255, 1)',
          pointBorderWidth: 1,
        },
      ],
    }
  }, [predictions])

  const options = useMemo(() => {
    const opts = getCommonOptions("Today's Tide Predictions", chartData.labels, activeHour, null)
    opts.onHover = (_event, elements) => {
      if (!onActiveHourChange) return
      const hoveredLabel = elements[0] ? chartData.labels[elements[0].index] : null
      onActiveHourChange(hoveredLabel ? getHoveredHourFromLabel(hoveredLabel) : null)
    }
    opts.scales.y.title = {
      display: true,
      text: 'Height in Feet (MLLW)',
      color: 'rgba(255, 255, 255, 0.88)',
    }
    const tideValues = chartData.datasets[0]?.data ?? []
    if (tideValues.length > 0) {
      const minValue = Math.min(...tideValues)
      const maxValue = Math.max(...tideValues)
      const padding = Math.max((maxValue - minValue) * 0.15, 0.5)
      opts.scales.y.min = minValue - padding
      opts.scales.y.max = maxValue + padding
    }
    return opts
  }, [chartData, activeHour, onActiveHourChange])

  return (
    <div style={{ position: 'relative', height: '100%' }}>
      <Line options={options} data={chartData} />
    </div>
  )
}
