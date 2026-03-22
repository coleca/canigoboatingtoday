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
export default function TideChart({ tideData, tideLoading = false }) {
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
    <div className="rounded-[28px] border border-white/25 bg-white/72 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.14)] backdrop-blur">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">Marine forecast</p>
          <h2 className="text-3xl font-bold text-slate-950">Today&apos;s Tide Predictions</h2>
        </div>
        {stationName && (
          <p className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-600">
            Nearest station: {stationName}
          </p>
        )}
      </div>
      {tideLoading && (
        <p className="mb-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sky-800">
          Loading tide predictions in the background...
        </p>
      )}
      {predictions.length === 0 ? (
        <p className="rounded-2xl bg-slate-50 p-4 text-slate-600">
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
