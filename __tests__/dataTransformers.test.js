import { extractHourlyDataForDay } from '@/lib/dataTransformers'

describe('dataTransformers', () => {
  test('returns empty hourly arrays when grid data is missing', () => {
    const result = extractHourlyDataForDay(null, '2026-04-16')

    expect(result.labels).toHaveLength(24)
    expect(result.wind.every((value) => value === null)).toBe(true)
    expect(result.wave.every((value) => value === null)).toBe(true)
    expect(result.temp.every((value) => value === null)).toBe(true)
    expect(result.precip.every((value) => value === null)).toBe(true)
  })

  test('converts each supported grid series into per-hour values for the requested day', () => {
    const gridData = {
      temperature: {
        values: [{ validTime: '2026-04-16T00:00:00-04:00/PT2H', value: 20 }],
      },
      windSpeed: {
        values: [{ validTime: '2026-04-16T06:00:00-04:00/PT3H', value: 16 }],
      },
      probabilityOfPrecipitation: {
        values: [{ validTime: '2026-04-16T12:00:00-04:00/PT2H', value: 35 }],
      },
      waveHeight: {
        values: [{ validTime: '2026-04-16T18:00:00-04:00/PT2H', value: 1.2 }],
      },
    }

    const result = extractHourlyDataForDay(gridData, '2026-04-16')

    expect(result.temp[0]).toBe(68)
    expect(result.temp[1]).toBe(68)
    expect(result.wind[6]).toBe(10)
    expect(result.wind[8]).toBe(10)
    expect(result.precip[12]).toBe(35)
    expect(result.precip[13]).toBe(35)
    expect(result.wave[18]).toBe(3.9)
    expect(result.wave[19]).toBe(3.9)
  })

  test('supports multi-day durations and ignores null values', () => {
    const gridData = {
      temperature: {
        values: [
          { validTime: '2026-04-15T23:00:00-04:00/P1DT2H', value: null },
          { validTime: '2026-04-15T23:00:00-04:00/PT3H', value: 10 },
        ],
      },
    }

    const result = extractHourlyDataForDay(gridData, '2026-04-16')

    expect(result.temp[0]).toBe(50)
    expect(result.temp[1]).toBe(50)
    expect(result.temp[2]).toBe(null)
  })
})
