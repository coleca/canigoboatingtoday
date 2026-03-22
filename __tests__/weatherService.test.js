import { getNWSForecast, getTideData, searchLocation } from '@/lib/weatherService'

global.fetch = jest.fn()

describe('weatherService', () => {
  beforeEach(() => {
    fetch.mockClear()
  })

  test('getNWSForecast calls the internal forecast endpoint', async () => {
    const payload = { forecast: { periods: [] }, hourly: { periods: [] }, alerts: [] }
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => payload,
    })

    const result = await getNWSForecast(34.0522, -118.2437)

    expect(result).toEqual(payload)
    expect(fetch).toHaveBeenCalledWith(
      '/api/forecast?lat=34.0522&lon=-118.2437',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    )
  })

  test('getTideData calls the internal tides endpoint', async () => {
    const payload = { predictions: [], station: null }
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => payload,
    })

    const result = await getTideData(34.0522, -118.2437)

    expect(result).toEqual(payload)
    expect(fetch).toHaveBeenCalledWith(
      '/api/tides?lat=34.0522&lon=-118.2437',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    )
  })

  test('searchLocation calls the internal location endpoint', async () => {
    const payload = { name: 'Annapolis, MD', latitude: 38.9784, longitude: -76.4922 }
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => payload,
    })

    const result = await searchLocation('Annapolis, MD')

    expect(result).toEqual(payload)
    expect(fetch).toHaveBeenCalledWith(
      '/api/location?q=Annapolis%2C%20MD',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    )
  })

  test('throws a friendly error when an internal request fails', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Forecast unavailable.' }),
    })

    await expect(getNWSForecast(1, 2)).rejects.toThrow('Forecast unavailable.')
  })
})
