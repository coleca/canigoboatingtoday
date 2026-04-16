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

export function formatWeekdayLabel(dateInput) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(new Date(dateInput))
}
