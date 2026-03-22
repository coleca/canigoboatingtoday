import { getTideData } from '@/lib/weatherService'

global.fetch = jest.fn()

describe('weatherService - tide data', () => {
  beforeEach(() => {
    fetch.mockClear()
  })

  test('returns tide payloads from the internal proxy endpoint', async () => {
    const payload = {
      predictions: [{ t: '2026-03-21 12:00', v: '4.0' }],
      station: { id: '8632200', name: 'Annapolis' },
    }

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => payload,
    })

    const result = await getTideData(38.9784, -76.4922)

    expect(result).toEqual(payload)
    expect(fetch).toHaveBeenCalledWith(
      '/api/tides?lat=38.9784&lon=-76.4922',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    )
  })
})
