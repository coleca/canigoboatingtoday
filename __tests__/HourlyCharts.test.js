import React from 'react'
import { render, screen } from '@testing-library/react'
import {
  buildActiveHourAnnotation,
  getCommonOptions,
  getHoveredHourFromLabel,
  PrecipChart,
  TempChart,
  WaveChart,
  WindChart,
} from '@/components/charts/HourlyCharts'

describe('HourlyCharts utilities', () => {
  test('getHoveredHourFromLabel parses common chart labels', () => {
    expect(getHoveredHourFromLabel(null)).toBeNull()
    expect(getHoveredHourFromLabel('bad label')).toBeNull()
    expect(getHoveredHourFromLabel('12 AM')).toBe(0)
    expect(getHoveredHourFromLabel('12 PM')).toBe(12)
    expect(getHoveredHourFromLabel('6:30 pm')).toBe(18)
  })

  test('buildActiveHourAnnotation only returns a line for matching labels', () => {
    const labels = ['6 AM', '7 AM', '8 AM']

    expect(buildActiveHourAnnotation(labels, null)).toEqual({})
    expect(buildActiveHourAnnotation(labels, 9)).toEqual({})
    expect(buildActiveHourAnnotation(labels, 7)).toEqual({
      activeHourLine: {
        type: 'line',
        xMin: '7 AM',
        xMax: '7 AM',
        borderColor: 'rgba(255, 255, 255, 0.45)',
        borderWidth: 2,
      },
    })
  })

  test('getCommonOptions forwards hovered hours and clears them when nothing is active', () => {
    const onActiveHourChange = jest.fn()
    const options = getCommonOptions('Wind Speed (mph)', ['6 AM', '7 AM'], 6, onActiveHourChange)

    options.onHover({}, [{ index: 1 }])
    options.onHover({}, [])

    expect(onActiveHourChange).toHaveBeenNthCalledWith(1, 7)
    expect(onActiveHourChange).toHaveBeenNthCalledWith(2, null)
    expect(options.plugins.annotation.annotations.activeHourLine.xMin).toBe('6 AM')
  })
})

describe('HourlyCharts components', () => {
  const labels = ['6 AM', '7 AM']

  test('renders each hourly chart with its configured title', () => {
    render(
      <>
        <WindChart windData={[10, 12]} labels={labels} />
        <WaveChart waveData={[3, 4]} labels={labels} />
        <TempChart tempData={[68, 70]} labels={labels} />
        <PrecipChart precipData={[20, 30]} labels={labels} />
      </>
    )

    expect(screen.getByText('Wind Speed (mph)')).toBeInTheDocument()
    expect(screen.getByText('Wave Height (ft)')).toBeInTheDocument()
    expect(screen.getByText('Temperature (°F)')).toBeInTheDocument()
    expect(screen.getByText('Precipitation (%)')).toBeInTheDocument()
  })
})
