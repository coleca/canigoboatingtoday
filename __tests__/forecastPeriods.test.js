import { formatWeekdayLabel, getDailyPeriods, getLocalDateKey } from '@/lib/forecastPeriods'

describe('forecastPeriods', () => {
  test('getLocalDateKey returns a stable local YYYY-MM-DD key', () => {
    expect(getLocalDateKey('2026-04-16T09:00:00-07:00')).toBe('2026-04-16')
  })

  test('getDailyPeriods collapses multiple periods from the same day into one card', () => {
    const periods = [
      { name: 'Today', isDaytime: true, startTime: '2026-04-16T06:00:00-07:00' },
      { name: 'This Afternoon', isDaytime: true, startTime: '2026-04-16T15:00:00-07:00' },
      { name: 'Tonight', isDaytime: false, startTime: '2026-04-16T21:00:00-07:00' },
      { name: 'Friday', isDaytime: true, startTime: '2026-04-17T09:00:00-07:00' },
      { name: 'Friday Night', isDaytime: false, startTime: '2026-04-17T21:00:00-07:00' },
    ]

    expect(getDailyPeriods(periods)).toEqual([
      periods[0],
      periods[3],
    ])
  })

  test('formatWeekdayLabel returns short weekday names', () => {
    expect(formatWeekdayLabel('2026-04-16T09:00:00-07:00')).toBe('Thu')
  })
})
