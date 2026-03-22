import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const revalidate = 86400

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')?.trim()

  if (!query) {
    return NextResponse.json({ error: 'Missing location query.' }, { status: 400 })
  }

  const url = `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${encodeURIComponent(query)}&benchmark=Public_AR_Current&format=json`

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'CanIGoBoatingToday/1.0 (support@canigoboatingtoday.com)',
      },
      next: { revalidate: 86400 },
    })

    if (!response.ok) {
      throw new Error(`Location lookup failed: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const match = data?.result?.addressMatches?.[0]

    if (!match) {
      return NextResponse.json({ error: 'No matching U.S. location found.' }, { status: 404 })
    }

    return NextResponse.json({
      name: match.matchedAddress,
      latitude: match.coordinates.y,
      longitude: match.coordinates.x,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Location lookup failed.' },
      { status: 502 }
    )
  }
}
