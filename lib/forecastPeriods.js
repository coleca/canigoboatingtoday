export function getLocalDateKey(dateInput) {
  if (typeof dateInput === 'string') {
    const isoDateMatch = dateInput.match(/^(\d{4}-\d{2}-\d{2})/)
    if (isoDateMatch) {
      return isoDateMatch[1]
    }
  }

  const date = new Date(dateInput)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getDailyPeriods(periods = []) {
  const groupedPeriods = new Map()

  for (const period of periods) {
    const dateKey = getLocalDateKey(period.startTime)
    const existing = groupedPeriods.get(dateKey) ?? []
    existing.push(period)
    groupedPeriods.set(dateKey, existing)
  }

  return Array.from(groupedPeriods.values())
    .map((group) => group.find((period) => period.isDaytime) ?? group[0])
    .slice(0, 7)
}

export function getDailyForecastCards(periods = []) {
  const groupedPeriods = new Map()

  for (const period of periods) {
    const dateKey = getLocalDateKey(period.startTime)
    const existing = groupedPeriods.get(dateKey) ?? []
    existing.push(period)
    groupedPeriods.set(dateKey, existing)
  }

  return Array.from(groupedPeriods.entries())
    .map(([dateKey, group]) => {
      const dayPeriod = group.find((period) => period.isDaytime) ?? group[0] ?? null
      const nightPeriod = group.find((period) => period.isDaytime === false) ?? null
      const anchorPeriod = dayPeriod ?? nightPeriod

      if (!anchorPeriod) {
        return null
      }

      return {
        dateKey,
        dayPeriod,
        nightPeriod,
        name: anchorPeriod.name,
        startTime: anchorPeriod.startTime,
        shortForecast: dayPeriod?.shortForecast ?? nightPeriod?.shortForecast ?? '',
        detailedForecast: dayPeriod?.detailedForecast ?? nightPeriod?.detailedForecast ?? '',
        temperatureHigh: dayPeriod?.temperature ?? anchorPeriod.temperature ?? null,
        temperatureLow: nightPeriod?.temperature ?? null,
        temperatureUnit: dayPeriod?.temperatureUnit ?? nightPeriod?.temperatureUnit ?? '',
      }
    })
    .filter(Boolean)
    .slice(0, 7)
}

export function formatWeekdayLabel(dateInput) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(new Date(dateInput))
}
