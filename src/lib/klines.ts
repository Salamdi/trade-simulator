import { strFromU8, unzipSync } from 'fflate'

const BASE = 'https://data.binance.vision/data/spot/monthly/klines/BTCUSDT/15m'
const FIRST_YEAR = 2017
const FIRST_MONTH = 8 // 1-based; BTCUSDT spot data starts 2017-08

export type Kline = [number, string, string, string, string, string]

type KlinesInput = {
  startTime?: number
  endTime?: number
  limit: number
}

// Monthly files never change, so each one is downloaded at most once.
const monthCache = new Map<string, Promise<Kline[]>>()

function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`
}

function parseCsv(csv: string): Kline[] {
  const out: Kline[] = []
  for (const line of csv.split('\n')) {
    const c = line.split(',')
    if (c.length < 6) continue
    let openTime = Number(c[0])
    if (!Number.isFinite(openTime)) continue // header row
    // Spot files from 2025-01 onward use microsecond timestamps.
    if (openTime > 1e14) openTime = Math.floor(openTime / 1000)
    out.push([openTime, c[1], c[2], c[3], c[4], c[5]])
  }
  return out
}

async function downloadMonth(year: number, month: number): Promise<Kline[]> {
  const key = monthKey(year, month)
  const res = await fetch(`${BASE}/BTCUSDT-15m-${key}.zip`)
  // Months that are not published yet (current month, future) return 404.
  if (res.status === 404 || res.status === 403) return []
  if (!res.ok) throw new Error(`Binance data ${res.status} ${res.statusText}`)
  const files = unzipSync(new Uint8Array(await res.arrayBuffer()))
  const entries = Object.values(files)
  if (!entries.length) return []
  return parseCsv(strFromU8(entries[0]))
}

function loadMonth(year: number, month: number): Promise<Kline[]> {
  const key = monthKey(year, month)
  let p = monthCache.get(key)
  if (!p) {
    p = downloadMonth(year, month)
    monthCache.set(key, p)
    p.catch(() => monthCache.delete(key)) // retry failed downloads next time
  }
  return p
}

function utcMonth(ts: number) {
  const d = new Date(ts)
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 }
}

/**
 * Same semantics as Binance's /klines endpoint: with `startTime`, the first
 * `limit` candles opening at or after it; with `endTime`, the last `limit`
 * candles opening at or before it.
 */
export async function getKlines(data: KlinesInput): Promise<Kline[]> {
  const { startTime, limit } = data

  if (startTime !== undefined) {
    const now = utcMonth(Date.now())
    let { year, month } = utcMonth(startTime)
    const out: Kline[] = []
    while (
      out.length < limit &&
      (year < now.year || (year === now.year && month <= now.month))
    ) {
      const candles = await loadMonth(year, month)
      for (const k of candles) {
        if (k[0] >= startTime) out.push(k)
        if (out.length === limit) break
      }
      if (month === 12) {
        year++
        month = 1
      } else month++
    }
    return out
  }

  const endTime = data.endTime ?? Date.now()
  let { year, month } = utcMonth(endTime)
  const out: Kline[] = []
  while (
    out.length < limit &&
    (year > FIRST_YEAR || (year === FIRST_YEAR && month >= FIRST_MONTH))
  ) {
    const candles = await loadMonth(year, month)
    out.unshift(...candles.filter((k) => k[0] <= endTime))
    if (month === 1) {
      year--
      month = 12
    } else month--
  }
  return out.slice(-limit)
}
