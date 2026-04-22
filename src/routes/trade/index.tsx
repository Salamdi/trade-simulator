import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { CandlestickChart } from '#/components/CandlestickChart'
import { getKlines, type Kline } from '#/server/binance'
import { cn } from '#/lib/utils'

export const Route = createFileRoute('/trade/')({
  component: RouteComponent,
})

const INTERVAL_MS = 15 * 60 * 1000
const DEFAULT_TP_PCT = 0.005
const DEFAULT_SL_PCT = 0.1
const FEE = 0.001

const FORWARD_OPTIONS = [
  { label: '15m', candles: 1 },
  { label: '1h',  candles: 4 },
  { label: '3h',  candles: 12 },
  { label: '6h',  candles: 24 },
  { label: '12h', candles: 48 },
  { label: '24h', candles: 96 },
]

function fetchKlines(startTime?: number, limit = 12) {
  return getKlines({
    data: startTime
      ? { startTime, limit }
      : { endTime: 1640995200000, limit: 1000 },
  })
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
  const [tpPct, setTpPct] = useState(DEFAULT_TP_PCT)
  const [slPct, setSlPct] = useState(DEFAULT_SL_PCT)
  const [buyPrice, setBuyPrice] = useState<number | null>(null)
  const [pendingLimit, setPendingLimit] = useState<number | null>(null)

  // Refs for async loadForward
  const btcRef = useRef(btc)
  const usdtRef = useRef(usdt)
  const tpRef = useRef(takeProfit)
  const slRef = useRef(stopLoss)
  const pendingLimitRef = useRef(pendingLimit)
  const tpPctRef = useRef(tpPct)
  const slPctRef = useRef(slPct)
  btcRef.current = btc
  usdtRef.current = usdt
  tpRef.current = takeProfit
  slRef.current = stopLoss
  pendingLimitRef.current = pendingLimit
  tpPctRef.current = tpPct
  slPctRef.current = slPct

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

  // Keep buy price in sync with last close when no position or pending order
  useEffect(() => {
    if (btc === 0 && pendingLimit === null && klines.length) {
      setBuyPrice(parseFloat(klines[klines.length - 1][4]))
    }
  }, [klines, btc, pendingLimit])

  function placeLimitOrder() {
    if (usdt <= 0 || !buyPrice) return
    setPendingLimit(buyPrice)
  }

  function cancelLimitOrder() {
    setPendingLimit(null)
  }

  async function loadForward() {
    if (!klines.length) return
    const lastTs = klines[klines.length - 1][0]
    setForwarding(true)
    try {
      const next = await fetchKlines(lastTs + INTERVAL_MS, forwardCandles)
      if (!next.length) return

      // Snapshot state for simulation
      let simBtc = btcRef.current
      let simUsdt = usdtRef.current
      let simTp = tpRef.current
      let simSl = slRef.current
      let simLimit = pendingLimitRef.current
      const simTpPct = tpPctRef.current
      const simSlPct = slPctRef.current

      let newLastBuyPrice: number | null = null
      let newLastSellPrice: number | null = null

      for (const candle of next) {
        const high = parseFloat(candle[2])
        const low = parseFloat(candle[3])

        // Check pending limit order
        if (simLimit !== null && simBtc === 0 && low <= simLimit) {
          simBtc = (simUsdt * (1 - FEE)) / simLimit
          simUsdt = 0
          newLastBuyPrice = simLimit
          newLastSellPrice = null
          simTp = simLimit * (1 + simTpPct)
          simSl = simLimit * (1 - simSlPct)
          simLimit = null
        }

        // Check SL then TP
        if (simBtc > 0 && simTp !== null && simSl !== null) {
          if (low <= simSl) {
            simUsdt = simBtc * simSl * (1 - FEE)
            simBtc = 0
            newLastSellPrice = simSl
            simTp = null
            simSl = null
            break
          }
          if (high >= simTp) {
            simUsdt = simBtc * simTp * (1 - FEE)
            simBtc = 0
            newLastSellPrice = simTp
            simTp = null
            simSl = null
            break
          }
        }
      }

      // Apply simulation results
      setBtc(simBtc)
      setUsdt(simUsdt)
      setTakeProfit(simTp)
      setStopLoss(simSl)
      setPendingLimit(simLimit)
      if (newLastBuyPrice !== null) {
        setLastBuyPrice(newLastBuyPrice)
        setLastSellPrice(null)
      }
      if (newLastSellPrice !== null) setLastSellPrice(newLastSellPrice)

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

  const hasPosition = btc > 0
  const hasPendingOrder = pendingLimit !== null

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
            {hasPendingOrder && (
              <>
                <span className="text-[var(--line)]">|</span>
                <span className="text-yellow-500 text-xs">
                  Limit <span className="tabular-nums font-medium">{fmt2(pendingLimit!)}</span>
                </span>
              </>
            )}
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
            <label className="flex items-center gap-1.5 text-xs text-[var(--sea-ink-soft)]">
              Price
              <input
                type="number"
                min="0"
                step="1"
                value={buyPrice ?? ''}
                onChange={(e) => setBuyPrice(parseFloat(e.target.value))}
                disabled={hasPosition || hasPendingOrder}
                className="w-24 px-2 py-1 rounded-md border border-[var(--line)] bg-[var(--surface)] text-[var(--sea-ink)] tabular-nums text-xs text-right focus:outline-none focus:ring-1 focus:ring-[var(--lagoon)] disabled:opacity-40"
              />
            </label>
            <label className="flex items-center gap-1.5 text-xs text-[#4fb8b2]">
              TP
              <div className="relative">
                <input
                  type="number"
                  min="0.1"
                  max="100"
                  step="0.1"
                  value={+(tpPct * 100).toFixed(2)}
                  onChange={(e) => setTpPct(parseFloat(e.target.value) / 100)}
                  disabled={hasPosition || hasPendingOrder}
                  className="w-16 px-2 py-1 pr-5 rounded-md border border-[var(--line)] bg-[var(--surface)] text-[var(--sea-ink)] tabular-nums text-xs text-right focus:outline-none focus:ring-1 focus:ring-[#4fb8b2] disabled:opacity-40"
                />
                <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[var(--sea-ink-soft)] text-xs pointer-events-none">%</span>
              </div>
            </label>
            <label className="flex items-center gap-1.5 text-xs text-[#e05c5c]">
              SL
              <div className="relative">
                <input
                  type="number"
                  min="0.1"
                  max="100"
                  step="0.1"
                  value={+(slPct * 100).toFixed(2)}
                  onChange={(e) => setSlPct(parseFloat(e.target.value) / 100)}
                  disabled={hasPosition || hasPendingOrder}
                  className="w-16 px-2 py-1 pr-5 rounded-md border border-[var(--line)] bg-[var(--surface)] text-[var(--sea-ink)] tabular-nums text-xs text-right focus:outline-none focus:ring-1 focus:ring-[#e05c5c] disabled:opacity-40"
                />
                <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[var(--sea-ink-soft)] text-xs pointer-events-none">%</span>
              </div>
            </label>
            {hasPendingOrder ? (
              <button
                onClick={cancelLimitOrder}
                className="px-5 py-2 rounded-lg text-sm font-medium bg-[var(--surface)] border border-yellow-500/40 text-yellow-500 hover:bg-yellow-500/10 transition-colors"
              >
                Cancel Order
              </button>
            ) : (
              <button
                onClick={placeLimitOrder}
                disabled={usdt <= 0 || !klines.length || hasPosition}
                className="px-5 py-2 rounded-lg text-sm font-medium bg-[#4fb8b2] text-white hover:bg-[var(--lagoon-deep)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Buy BTC
              </button>
            )}
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
            'flex items-center gap-4 px-4 py-1.5 border-t border-[var(--line)] text-xs',
            lastSellPrice !== null && lastBuyPrice !== null
              ? lastSellPrice - lastBuyPrice > 0 ? 'text-green-500' : 'text-red-500'
              : 'text-[var(--sea-ink-soft)]',
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
