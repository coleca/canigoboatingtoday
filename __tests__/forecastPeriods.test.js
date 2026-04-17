import {
  formatWeekdayLabel,
  getDailyForecastCards,
  getDailyPeriods,
  getLocalDateKey,
} from '@/lib/forecastPeriods'

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

  test('getDailyForecastCards pairs daytime and nighttime periods for one decision card', () => {
    const periods = [
      {
        name: 'Thursday',
        isDaytime: true,
        temperature: 72,
        temperatureUnit: 'F',
        shortForecast: 'Sunny',
        detailedForecast: 'Sunny with light winds.',
        startTime: '2026-04-16T06:00:00-07:00',
      },
      {
        name: 'Thursday Night',
        isDaytime: false,
        temperature: 60,
        temperatureUnit: 'F',
        shortForecast: 'Mostly clear',
        detailedForecast: 'Mostly clear overnight.',
        startTime: '2026-04-16T19:45:00-07:00',
      },
    ]

    expect(getDailyForecastCards(periods)).toEqual([
      {
        dateKey: '2026-04-16',
        dayPeriod: periods[0],
        nightPeriod: periods[1],
        name: 'Thursday',
        startTime: '2026-04-16T06:00:00-07:00',
        shortForecast: 'Sunny',
        detailedForecast: 'Sunny with light winds.',
        temperatureHigh: 72,
        temperatureLow: 60,
        temperatureUnit: 'F',
      },
    ])
  })
})
