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
export default function TideChart({ tideData }) {
  // The API returns an object with a 'predictions' array
  const predictions = tideData?.predictions || []

  // Format the data for Chart.js
  const chartData = useMemo(() => {
    const labels = []
    const data = []

    predictions.forEach((p) => {
      // Use the pre-instantiated formatter and replace space with T for ISO format
      labels.push(
        timeFormatter.format(new Date(p.t.replace(' ', 'T')))
      )
      data.push(p.v)
    })

    return {
      labels,
      datasets: [
        {
          label: 'Tide Height (ft)',
          data,
          borderColor: 'rgb(54, 162, 235)',
          backgroundColor: 'rgba(54, 162, 235, 0.5)',
          tension: 0.4, // Make the line smooth
        },
      ],
    }
  }, [predictions])

  const options = useMemo(
    () => ({
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
      },
      scales: {
        y: {
          title: {
            display: true,
            text: 'Height in Feet (MLLW)',
          },
        },
      },
    }),
    []
  )

  return (
    <div style={{ position: 'relative', height: '400px' }}>
      <Line options={options} data={chartData} />
    </div>
  )
}
