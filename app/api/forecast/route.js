import { NextResponse } from 'next/server'

const NWS_HEADERS = {
  Accept: 'application/geo+json',
  'User-Agent': 'CanIGoBoatingToday/1.0 (support@canigoboatingtoday.com)',
}

export const runtime = 'nodejs'
export const revalidate = 600

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const latitude = searchParams.get('lat')
  const longitude = searchParams.get('lon')

  if (!latitude || !longitude) {
    return NextResponse.json({ error: 'Missing lat/lon parameters.' }, { status: 400 })
  }

  try {
    const points = await fetchJson(`https://api.weather.gov/points/${latitude},${longitude}`, {
      headers: NWS_HEADERS,
      next: { revalidate: 600 },
    })

    const [forecast, hourly, alerts] = await Promise.all([
      fetchJson(points.properties.forecast, {
        headers: NWS_HEADERS,
        next: { revalidate: 600 },
      }),
      fetchJson(points.properties.forecastHourly, {
        headers: NWS_HEADERS,
        next: { revalidate: 600 },
      }),
      fetchJson(`https://api.weather.gov/alerts/active?point=${latitude},${longitude}`, {
        headers: NWS_HEADERS,
        next: { revalidate: 300 },
      }),
    ])

    return NextResponse.json({
      forecast: forecast.properties,
      hourly: hourly.properties,
      alerts: alerts.features ?? [],
      meta: {
        city: points.properties?.relativeLocation?.properties?.city ?? '',
        state: points.properties?.relativeLocation?.properties?.state ?? '',
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Forecast unavailable.' },
      { status: 502 }
    )
  }
}

async function fetchJson(url, options) {
  const response = await fetch(url, options)

  if (!response.ok) {
    throw new Error(`Upstream weather request failed: ${response.status} ${response.statusText}`)
  }

  return response.json()
}
