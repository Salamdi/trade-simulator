import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { CandlestickChart, type Kline } from '#/components/CandlestickChart'
import { cn } from '#/lib/utils'

export const Route = createFileRoute('/trade/')({
  component: RouteComponent,
})

const INTERVAL_MS = 15 * 60 * 1000
const TP_PCT = 0.01
const SL_PCT = 0.02
const FEE = 0.001

const FORWARD_OPTIONS = [
  { label: '15m', candles: 1 },
  { label: '1h',  candles: 4 },
  { label: '3h',  candles: 12 },
  { label: '6h',  candles: 24 },
  { label: '12h', candles: 48 },
  { label: '24h', candles: 96 },
]

async function fetchKlines(startTime?: number, limit = 12): Promise<Kline[]> {
  const params = new URLSearchParams({
    symbol: 'BTCUSDT',
    interval: '15m',
    ...(startTime
      ? { startTime: String(startTime), limit: String(limit) }
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
  const [lastBuyPrice, setLastBuyPrice] = useState<number | null>(null)
  const [lastSellPrice, setLastSellPrice] = useState<number | null>(null)
  const [forwardCandles, setForwardCandles] = useState(12)

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
    const acquired = (usdt * (1 - FEE)) / price
    setBtc(acquired)
    setUsdt(0)
    setLastBuyPrice(price)
    setLastSellPrice(null)
    setTakeProfit(price * (1 + TP_PCT))
    setStopLoss(price * (1 - SL_PCT))
  }

  async function loadForward() {
    if (!klines.length) return
    const lastTs = klines[klines.length - 1][0]
    setForwarding(true)
    try {
      const next = await fetchKlines(lastTs + INTERVAL_MS, forwardCandles)
      if (!next.length) return

      const tp = tpRef.current
      const sl = slRef.current
      const currentBtc = btcRef.current

      if (tp !== null && sl !== null && currentBtc > 0) {
        for (const candle of next) {
          const high = parseFloat(candle[2])
          const low = parseFloat(candle[3])

          if (low <= sl) {
            setUsdt(currentBtc * sl * (1 - FEE))
            setBtc(0)
            setLastSellPrice(sl)
            setTakeProfit(null)
            setStopLoss(null)
            break
          }
          if (high >= tp) {
            setUsdt(currentBtc * tp * (1 - FEE))
            setBtc(0)
            setLastSellPrice(tp)
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
      <div className="shrink-0 border-t border-[var(--line)] bg-[var(--header-bg)] backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 py-3">
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
          <div className="flex rounded-lg border border-[var(--line)] overflow-hidden">
            {FORWARD_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                onClick={() => setForwardCandles(opt.candles)}
                className={cn(
                  'px-2.5 py-2 text-xs font-medium transition-colors',
                  forwardCandles === opt.candles
                    ? 'bg-[var(--lagoon)] text-white'
                    : 'bg-[var(--surface)] text-[var(--sea-ink-soft)] hover:bg-[var(--surface-strong)]',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            onClick={loadForward}
            disabled={forwarding}
            className="px-5 py-2 rounded-lg text-sm font-medium bg-[var(--surface)] border border-[var(--line)] text-[var(--sea-ink)] hover:bg-[var(--surface-strong)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {forwarding ? 'Loading…' : 'Forward →'}
          </button>
        </div>
        </div>
        {(lastBuyPrice !== null || lastSellPrice !== null) && (
          <div className={cn(
            "flex items-center gap-4 px-4 py-1.5 border-b border-[var(--line)] text-xs",
            lastSellPrice !== null && lastBuyPrice !== null
              ? lastSellPrice - lastBuyPrice > 0 ? "text-green-500" : "text-red-500"
              : "text-[var(--sea-ink-soft)]"
          )}>
            {lastBuyPrice !== null && (
              <span>
                Bought <span className="tabular-nums font-medium text-[var(--sea-ink)]">{fmt2(lastBuyPrice)}</span>
              </span>
            )}
            {lastBuyPrice !== null && lastSellPrice !== null && (
              <span className="text-[var(--line)]">|</span>
            )}
            {lastSellPrice !== null && (
              <span>
                Sold <span className="tabular-nums font-medium text-[var(--sea-ink)]">{fmt2(lastSellPrice)}</span>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
