import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { CandlestickChart, type Kline } from '#/components/CandlestickChart'

export const Route = createFileRoute('/trade/')({
  component: RouteComponent,
})

const INTERVAL_MS = 15 * 60 * 1000
const TP_PCT = 0.01
const SL_PCT = 0.02

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

function fmt2(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function RouteComponent() {
  const [klines, setKlines] = useState<Kline[]>([])
  const [forwarding, setForwarding] = useState(false)
  const [usdt, setUsdt] = useState(10_000)
  const [btc, setBtc] = useState(0)
  const [takeProfit, setTakeProfit] = useState<number | null>(null)
  const [stopLoss, setStopLoss] = useState<number | null>(null)

  // Refs so the async loadForward always reads latest values
  const btcRef = useRef(btc)
  const tpRef = useRef(takeProfit)
  const slRef = useRef(stopLoss)
  btcRef.current = btc
  tpRef.current = takeProfit
  slRef.current = stopLoss

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
    const acquired = usdt / price
    setBtc(acquired)
    setUsdt(0)
    setTakeProfit(price * (1 + TP_PCT))
    setStopLoss(price * (1 - SL_PCT))
  }

  async function loadForward() {
    if (!klines.length) return
    const lastTs = klines[klines.length - 1][0]
    setForwarding(true)
    try {
      const next = await fetchKlines(lastTs + INTERVAL_MS)
      if (!next.length) return

      const tp = tpRef.current
      const sl = slRef.current
      const currentBtc = btcRef.current

      if (tp !== null && sl !== null && currentBtc > 0) {
        for (const candle of next) {
          const high = parseFloat(candle[2])
          const low = parseFloat(candle[3])

          if (low <= sl) {
            setUsdt(currentBtc * sl)
            setBtc(0)
            setTakeProfit(null)
            setStopLoss(null)
            break
          }
          if (high >= tp) {
            setUsdt(currentBtc * tp)
            setBtc(0)
            setTakeProfit(null)
            setStopLoss(null)
            break
          }
        }
      }

      setKlines((prev) => [...prev, ...next])
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
              {fmt2(usdt)}
            </span>
          </span>
          <span className="text-[var(--line)]">|</span>
          <span className="text-[var(--sea-ink-soft)]">
            BTC{' '}
            <span className="font-medium text-[var(--sea-ink)] tabular-nums">
              {btc.toLocaleString('en-US', { minimumFractionDigits: 6, maximumFractionDigits: 6 })}
            </span>
          </span>
          {takeProfit !== null && (
            <>
              <span className="text-[var(--line)]">|</span>
              <span className="text-[#4fb8b2] text-xs">
                TP <span className="tabular-nums font-medium">{fmt2(takeProfit)}</span>
              </span>
            </>
          )}
          {stopLoss !== null && (
            <>
              <span className="text-[var(--line)]">|</span>
              <span className="text-[#e05c5c] text-xs">
                SL <span className="tabular-nums font-medium">{fmt2(stopLoss)}</span>
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={buy}
            disabled={usdt <= 0 || !klines.length || btc > 0}
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
