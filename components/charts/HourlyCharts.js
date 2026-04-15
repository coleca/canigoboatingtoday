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

const getCommonOptions = (title) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { display: false },
        title: { display: true, text: title, color: 'white', font: { size: 16 } },
        tooltip: { mode: 'index', intersect: false }
    },
    scales: {
        x: { ticks: { color: 'rgba(255, 255, 255, 0.8)' }, grid: { color: 'rgba(255, 255, 255, 0.1)' } },
        y: { ticks: { color: 'rgba(255, 255, 255, 0.8)' }, grid: { color: 'rgba(255, 255, 255, 0.1)' } }
    }
})

// Using a 2-digit hour array mapping is simplified here for now.
const getLabels = (startHour) => {
    return Array.from({length: 24}).map((_, i) => {
        let hr = (startHour + i) % 24;
        let ampm = hr >= 12 ? 'PM' : 'AM';
        let dispHr = hr % 12 || 12;
        return `${dispHr} ${ampm}`;
    })
}

export function WindChart({ windData, labels }) {
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
        const opts = getCommonOptions('Wind Speed (mph)');
        opts.scales.y.min = 0;
        return opts;
    }, [])

    return <Line data={data} options={options} />
}

export function PrecipChart({ precipData, labels }) {
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
        const opts = getCommonOptions('Precipitation (%)');
        opts.scales.y.min = 0;
        opts.scales.y.max = 100;
        return opts;
    }, [])

    return <Line data={data} options={options} />
}

export function TempChart({ tempData, labels }) {
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

    const options = useMemo(() => getCommonOptions('Temperature (°F)'), [])

    return <Line data={data} options={options} />
}

export function WaveChart({ waveData, labels }) {
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
        const opts = getCommonOptions('Wave Height (ft)');
        opts.scales.y.min = 0;
        return opts;
    }, [])

    return <Line data={data} options={options} />
}
