import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { CandlestickChart, type Kline } from '#/components/CandlestickChart'

export const Route = createFileRoute('/trade/')({
  component: RouteComponent,
})

const INTERVAL_MS = 15 * 60 * 1000

async function fetchKlines(startTime?: number): Promise<Kline[]> {
  const params = new URLSearchParams({
    symbol: 'BTCUSDT',
    interval: '15m',
    ...(startTime
      ? { startTime: String(startTime), limit: '12' }
      : { endTime: '1640995200000', limit: '1000' }),
  })
  const res = await fetch(`/api/v3/uiKlines?${params}`)
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json()
}

function RouteComponent() {
  const [klines, setKlines] = useState<Kline[]>([])
  const [forwarding, setForwarding] = useState(false)
  const [usdt, setUsdt] = useState(10_000)
  const [btc, setBtc] = useState(0)

  const { data, isPending, isError, error } = useQuery({
    queryKey: ['uiKlines', 'BTCUSDT', '15m'],
    queryFn: () => fetchKlines(),
    staleTime: 0,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
    refetchOnReconnect: false,
  })

  useEffect(() => {
    if (data) setKlines(data)
  }, [data])

  function buy() {
    if (usdt <= 0 || !klines.length) return
    const price = parseFloat(klines[klines.length - 1][4])
    setBtc((prev) => prev + usdt / price)
    setUsdt(0)
  }

  async function loadForward() {
    if (!klines.length) return
    const lastTs = klines[klines.length - 1][0]
    setForwarding(true)
    try {
      const next = await fetchKlines(lastTs + INTERVAL_MS)
      if (next.length) setKlines((prev) => [...prev, ...next])
    } finally {
      setForwarding(false)
    }
  }

  if (isPending) {
    return (
      <div className="flex items-center justify-center h-screen text-[var(--sea-ink-soft)] text-sm">
        Loading…
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-screen text-red-500 text-sm">
        {error.message}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 min-h-0">
        <CandlestickChart klines={klines} />
      </div>
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-t border-[var(--line)] bg-[var(--header-bg)] backdrop-blur-sm">
        <div className="flex items-center gap-4 text-sm">
          <span className="text-[var(--sea-ink-soft)]">
            USDT{' '}
            <span className="font-medium text-[var(--sea-ink)] tabular-nums">
              {usdt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </span>
          <span className="text-[var(--line)]">|</span>
          <span className="text-[var(--sea-ink-soft)]">
            BTC{' '}
            <span className="font-medium text-[var(--sea-ink)] tabular-nums">
              {btc.toLocaleString('en-US', { minimumFractionDigits: 6, maximumFractionDigits: 6 })}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={buy}
            disabled={usdt <= 0 || !klines.length}
            className="px-5 py-2 rounded-lg text-sm font-medium bg-[#4fb8b2] text-white hover:bg-[var(--lagoon-deep)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Buy BTC
          </button>
          <button
            onClick={loadForward}
            disabled={forwarding}
            className="px-5 py-2 rounded-lg text-sm font-medium bg-[var(--surface)] border border-[var(--line)] text-[var(--sea-ink)] hover:bg-[var(--surface-strong)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {forwarding ? 'Loading…' : 'Forward 3h →'}
          </button>
        </div>
      </div>
    </div>
  )
}
