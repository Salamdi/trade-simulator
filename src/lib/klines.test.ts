import type { getKlines as getKlinesType } from './klines'
import { strToU8, zipSync } from 'fflate'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const STEP = 15 * 60 * 1000

// Builds a monthly zip like data.binance.vision's: headerless CSV, 15m candles.
function monthZip(year: number, month: number, unit = 1) {
  const start = Date.UTC(year, month - 1, 1)
  const end = Date.UTC(year, month, 1)
  const rows: string[] = []
  for (let t = start; t < end; t += STEP) {
    rows.push(`${t * unit},1,2,0.5,1.5,10,${(t + STEP - 1) * unit},0,0,0,0,0`)
  }
  return zipSync({
    [`BTCUSDT-15m-${year}-${month}.csv`]: strToU8(rows.join('\n')),
  })
}

describe('getKlines', () => {
  const fetchMock = vi.fn()

  let getKlines: typeof getKlinesType

  beforeEach(async () => {
    vi.resetModules() // the month cache is module state
    ;({ getKlines } = await import('./klines'))
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => vi.unstubAllGlobals())

  function serve(months: Partial<Record<string, Uint8Array>>) {
    fetchMock.mockImplementation(async (url: string) => {
      const key = /(\d{4}-\d{2})\.zip$/.exec(url)?.[1] ?? ''
      const body = months[key]
      return body
        ? new Response(body.slice())
        : new Response('nope', { status: 404, statusText: 'Not Found' })
    })
  }

  it('returns the last `limit` candles up to endTime, across months', async () => {
    serve({ '2021-11': monthZip(2021, 11), '2021-12': monthZip(2021, 12) })
    const endTime = Date.UTC(2021, 11, 1, 0, 30) // inclusive
    const res = await getKlines({ endTime, limit: 5 })
    expect(res.map((k) => k[0])).toEqual([
      endTime - 4 * STEP,
      endTime - 3 * STEP,
      endTime - 2 * STEP,
      endTime - STEP,
      endTime,
    ])
    expect(res[0].slice(1)).toEqual(['1', '2', '0.5', '1.5', '10'])
  })

  it('returns the first `limit` candles from startTime, crossing a month boundary', async () => {
    serve({ '2022-01': monthZip(2022, 1), '2022-02': monthZip(2022, 2) })
    const startTime = Date.UTC(2022, 0, 31, 23, 30)
    const res = await getKlines({ startTime, limit: 4 })
    expect(res.map((k) => k[0])).toEqual([
      startTime,
      startTime + STEP,
      Date.UTC(2022, 1, 1),
      Date.UTC(2022, 1, 1) + STEP,
    ])
  })

  it('normalises microsecond timestamps to milliseconds', async () => {
    serve({ '2025-01': monthZip(2025, 1, 1000) })
    const startTime = Date.UTC(2025, 0, 1)
    const res = await getKlines({ startTime, limit: 2 })
    expect(res.map((k) => k[0])).toEqual([startTime, startTime + STEP])
  })

  it('stops at months that are not published and downloads each month once', async () => {
    serve({ '2022-03': monthZip(2022, 3) })
    const startTime = Date.UTC(2022, 2, 31, 23, 45)
    const res = await getKlines({ startTime, limit: 10 })
    expect(res).toHaveLength(1)
    await getKlines({ startTime, limit: 10 })
    expect(
      fetchMock.mock.calls.filter(([u]) => u.includes('2022-03')),
    ).toHaveLength(1)
  })

  it('throws on server errors and retries them later', async () => {
    fetchMock.mockResolvedValueOnce(new Response('x', { status: 500 }))
    await expect(
      getKlines({ startTime: Date.UTC(2023, 0, 1), limit: 1 }),
    ).rejects.toThrow('500')
    serve({ '2023-01': monthZip(2023, 1) })
    await expect(
      getKlines({ startTime: Date.UTC(2023, 0, 1), limit: 1 }),
    ).resolves.toHaveLength(1)
  })
})
