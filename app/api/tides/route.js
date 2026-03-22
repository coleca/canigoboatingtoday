import { NextResponse } from 'next/server'
import { getHaversineDistance } from '@/lib/locationUtils'

const TIDE_STATIONS_URL = 'https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json?type=tidepredictions'
const NOAA_HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'CanIGoBoatingToday/1.0 (support@canigoboatingtoday.com)',
}

export const runtime = 'nodejs'
export const revalidate = 3600

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const latitude = Number.parseFloat(searchParams.get('lat') || '')
  const longitude = Number.parseFloat(searchParams.get('lon') || '')

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return NextResponse.json({ error: 'Missing lat/lon parameters.' }, { status: 400 })
  }

  try {
    const stationsResponse = await fetch(TIDE_STATIONS_URL, {
      headers: NOAA_HEADERS,
      next: { revalidate: 86400 },
    })

    if (!stationsResponse.ok) {
      throw new Error(`NOAA station request failed: ${stationsResponse.status} ${stationsResponse.statusText}`)
    }

    const stationsData = await stationsResponse.json()
    const station = findClosestStation(stationsData.stations ?? [], latitude, longitude)

    if (!station) {
      return NextResponse.json({ predictions: [], station: null })
    }

    const today = new Date()
    const dateString = `${today.getFullYear()}${`${today.getMonth() + 1}`.padStart(2, '0')}${`${today.getDate()}`.padStart(2, '0')}`
    const tideUrl = `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?begin_date=${dateString}&end_date=${dateString}&station=${station.id}&product=predictions&datum=MLLW&time_zone=lst_ldt&units=english&format=json&interval=h`
    const tideResponse = await fetch(tideUrl, {
      headers: NOAA_HEADERS,
      next: { revalidate: 3600 },
    })

    if (!tideResponse.ok) {
      throw new Error(`NOAA tide request failed: ${tideResponse.status} ${tideResponse.statusText}`)
    }

    const tideData = await tideResponse.json()

    return NextResponse.json({
      ...tideData,
      station,
    })
  } catch (error) {
    return NextResponse.json(
      {
        predictions: [],
        station: null,
        error: error instanceof Error ? error.message : 'Tide data unavailable.',
      },
      { status: 200 }
    )
  }
}

function findClosestStation(stations, latitude, longitude) {
  let closestStation = null
  let minDistance = Number.POSITIVE_INFINITY

  for (const station of stations) {
    const distance = getHaversineDistance(latitude, longitude, station.lat, station.lng)
    if (distance < minDistance) {
      minDistance = distance
      closestStation = station
    }
  }

  return closestStation
}
