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
  Filler
} from 'chart.js'
import annotationPlugin from 'chartjs-plugin-annotation'

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

const CHART_TEXT_COLOR = 'rgba(255, 255, 255, 0.88)'
const CHART_GRID_COLOR = 'rgba(255, 255, 255, 0.12)'
const CHART_LINE_COLOR = 'rgba(255, 255, 255, 0.45)'

export function getHoveredHourFromLabel(label) {
  if (!label) return null
  const trimmed = String(label).trim()
  const match = trimmed.match(/^(\d{1,2})(?::\d{2})?\s*(AM|PM)$/i)

  if (!match) return null

  const rawHour = Number(match[1]) % 12
  const meridiem = match[2].toUpperCase()
  return meridiem === 'PM' ? rawHour + 12 : rawHour
}

export function buildActiveHourAnnotation(labels, activeHour) {
  if (activeHour === null || activeHour === undefined) return {}

  const activeLabel = labels.find((label) => getHoveredHourFromLabel(label) === activeHour)
  if (!activeLabel) return {}

  return {
    activeHourLine: {
      type: 'line',
      xMin: activeLabel,
      xMax: activeLabel,
      borderColor: CHART_LINE_COLOR,
      borderWidth: 2,
    },
  }
}

export function getCommonOptions(title, labels, activeHour, onActiveHourChange) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    onHover: (_event, elements) => {
      if (!onActiveHourChange) return
      const hoveredLabel = elements[0] ? labels[elements[0].index] : null
      onActiveHourChange(hoveredLabel ? getHoveredHourFromLabel(hoveredLabel) : null)
    },
    plugins: {
      legend: { display: false },
      title: { display: true, text: title, color: 'white', font: { size: 16 } },
      tooltip: { mode: 'index', intersect: false },
      annotation: {
        annotations: buildActiveHourAnnotation(labels, activeHour),
      },
    },
    scales: {
      x: { ticks: { color: CHART_TEXT_COLOR }, grid: { color: CHART_GRID_COLOR } },
      y: { ticks: { color: CHART_TEXT_COLOR }, grid: { color: CHART_GRID_COLOR } },
    },
  }
}

export function WindChart({ windData, labels, activeHour, onActiveHourChange }) {
    const data = useMemo(() => ({
        labels,
        datasets: [{
            label: 'Wind Speed',
            data: windData,
            borderColor: 'rgba(255, 99, 132, 0.8)',
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            fill: true,
            tension: 0.4
        }]
    }), [windData, labels])

    const options = useMemo(() => {
        const opts = getCommonOptions('Wind Speed (mph)', labels, activeHour, onActiveHourChange)
        opts.scales.y.min = 0
        return opts
    }, [labels, activeHour, onActiveHourChange])

    return <Line data={data} options={options} />
}

export function PrecipChart({ precipData, labels, activeHour, onActiveHourChange }) {
    const data = useMemo(() => ({
        labels,
        datasets: [{
            label: 'Precipitation',
            data: precipData,
            borderColor: 'rgba(54, 162, 235, 0.8)',
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            fill: true,
            tension: 0.4
        }]
    }), [precipData, labels])

    const options = useMemo(() => {
        const opts = getCommonOptions('Precipitation (%)', labels, activeHour, onActiveHourChange)
        opts.scales.y.min = 0
        opts.scales.y.max = 100
        return opts
    }, [labels, activeHour, onActiveHourChange])

    return <Line data={data} options={options} />
}

export function TempChart({ tempData, labels, activeHour, onActiveHourChange }) {
    const data = useMemo(() => ({
        labels,
        datasets: [{
            label: 'Temperature',
            data: tempData,
            borderColor: 'rgba(255, 206, 86, 0.8)',
            backgroundColor: 'rgba(255, 206, 86, 0.2)',
            fill: true,
            tension: 0.4
        }]
    }), [tempData, labels])

    const options = useMemo(
      () => getCommonOptions('Temperature (°F)', labels, activeHour, onActiveHourChange),
      [labels, activeHour, onActiveHourChange]
    )

    return <Line data={data} options={options} />
}

export function WaveChart({ waveData, labels, activeHour, onActiveHourChange }) {
    const data = useMemo(() => ({
        labels,
        datasets: [{
            label: 'Wave Height',
            data: waveData,
            borderColor: 'rgba(75, 192, 192, 0.8)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            fill: true,
            tension: 0.4
        }]
    }), [waveData, labels])

    const options = useMemo(() => {
        const opts = getCommonOptions('Wave Height (ft)', labels, activeHour, onActiveHourChange)
        opts.scales.y.min = 0
        return opts
    }, [labels, activeHour, onActiveHourChange])

    return <Line data={data} options={options} />
}
