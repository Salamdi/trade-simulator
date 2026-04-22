import { createServerFn } from '@tanstack/react-start'

const BINANCE_BASE = 'https://www.binance.com/api/v3'

type KlinesInput = {
  startTime?: number
  limit: number
  endTime?: number
}

export type Kline = [number, string, string, string, string, string]

export const getKlines = createServerFn()
  .inputValidator((input: KlinesInput) => input)
  .handler(async ({ data }): Promise<Kline[]> => {
    const params = new URLSearchParams({
      symbol: 'BTCUSDT',
      interval: '15m',
      limit: String(data.limit),
      ...(data.startTime ? { startTime: String(data.startTime) } : {}),
      ...(data.endTime ? { endTime: String(data.endTime) } : {}),
    })
    const res = await fetch(`${BINANCE_BASE}/uiKlines?${params}`)
    if (!res.ok) throw new Error(`Binance ${res.status} ${res.statusText}`)
    return res.json()
  })
