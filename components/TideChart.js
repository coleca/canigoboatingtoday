'use client'

import React from 'react'
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
} from 'chart.js'

// Register the necessary components for Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

/**
 * Renders a line chart of tide predictions.
 * @param {{tideData: object}} props - The component props.
 * @param {object} props.tideData - The raw tide prediction data from the NOAA API.
 */
export default function TideChart({ tideData }) {
  // The API returns an object with a 'predictions' array
  const predictions = tideData?.predictions || []
  const stationName = tideData?.station?.name

  // Format the data for Chart.js
  const chartData = {
    labels: predictions.map((p) => new Date(p.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })),
    datasets: [
      {
        label: 'Tide Height (ft)',
        data: predictions.map((p) => Math.round(Number.parseFloat(p.v))),
        borderColor: 'rgb(54, 162, 235)',
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
        tension: 0.4, // Make the line smooth
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: "Today's Tide Predictions",
      },
      tooltip: {
        callbacks: {
          label: (context) => `${Math.round(context.parsed.y)} ft`,
        },
      },
    },
    scales: {
      y: {
        title: {
          display: true,
          text: 'Height in Feet (MLLW)',
        },
        ticks: {
          callback: (value) => `${Math.round(value)}`,
        },
      },
    },
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">Today&apos;s Tide Predictions</h2>
        {stationName && <p className="text-sm text-slate-600">Nearest station: {stationName}</p>}
      </div>
      {predictions.length === 0 ? (
        <p className="rounded-lg bg-slate-50 p-4 text-slate-600">
          Tide predictions are unavailable for this area right now. Forecast and radar data are still available.
        </p>
      ) : (
        <div style={{ position: 'relative', height: '400px' }}>
          <Line options={options} data={chartData} />
        </div>
      )}
    </div>
  )
}
