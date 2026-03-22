const FETCH_TIMEOUT_MS = 12000

export async function getNWSForecast(latitude, longitude) {
  const response = await fetchWithTimeout(`/api/forecast?lat=${latitude}&lon=${longitude}`)
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Forecast unavailable.')
  }

  return data
}

export async function getTideData(latitude, longitude) {
  const response = await fetchWithTimeout(`/api/tides?lat=${latitude}&lon=${longitude}`)
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Tide data unavailable.')
  }

  return data
}

export async function searchLocation(query) {
  const trimmedQuery = query.trim()

  if (!trimmedQuery) {
    throw new Error('Enter a U.S. city, state, or ZIP code.')
  }

  const response = await fetchWithTimeout(`/api/location?q=${encodeURIComponent(trimmedQuery)}`)
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Location search failed.')
  }

  return data
}

async function fetchWithTimeout(url, options = {}, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    })
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('The weather service timed out.')
    }

    throw new Error('Failed to fetch')
  } finally {
    clearTimeout(timeout)
  }
}
