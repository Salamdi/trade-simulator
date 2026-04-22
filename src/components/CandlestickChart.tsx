import { useEffect, useRef, useState } from 'react'
import {
  createChart,
  CandlestickSeries,
  ColorType,
  type Time,
  type ISeriesApi,
  type MouseEventParams,
  type CandlestickData,
} from 'lightweight-charts'
import { Card, CardContent } from '#/components/ui/card'

export type Kline = [number, string, string, string, string, string]

type HoveredCandle = {
  open: number
  high: number
  low: number
  close: number
  volume: string
  time: number
}

function toChartData(klines: Kline[]) {
  return klines.map(([ts, open, high, low, close]) => ({
    time: (ts / 1000) as Time,
    open: parseFloat(open),
    high: parseFloat(high),
    low: parseFloat(low),
    close: parseFloat(close),
  }))
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function CandlestickChart({ klines }: { klines: Kline[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const klinesRef = useRef(klines)
  const [hovered, setHovered] = useState<HoveredCandle | null>(null)

  klinesRef.current = klines

  // Create chart once on mount
  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0a1418' },
        textColor: '#afcdc8',
      },
      grid: {
        vertLines: { color: 'rgba(141,229,219,0.06)' },
        horzLines: { color: 'rgba(141,229,219,0.06)' },
      },
      crosshair: {
        vertLine: { color: 'rgba(96,215,207,0.4)' },
        horzLine: { color: 'rgba(96,215,207,0.4)' },
      },
      rightPriceScale: { borderColor: 'rgba(141,229,219,0.12)' },
      timeScale: {
        borderColor: 'rgba(141,229,219,0.12)',
        timeVisible: true,
        secondsVisible: false,
      },
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    })

    seriesRef.current = chart.addSeries(CandlestickSeries, {
      upColor: '#4fb8b2',
      downColor: '#e05c5c',
      borderUpColor: '#4fb8b2',
      borderDownColor: '#e05c5c',
      wickUpColor: '#4fb8b2',
      wickDownColor: '#e05c5c',
    })

    chart.subscribeCrosshairMove((param: MouseEventParams<Time>) => {
      if (!param.time || !seriesRef.current) {
        setHovered(null)
        return
      }
      const candle = param.seriesData.get(seriesRef.current) as CandlestickData | undefined
      if (!candle) {
        setHovered(null)
        return
      }
      const ts = (param.time as number) * 1000
      const kline = klinesRef.current.find((k) => k[0] === ts)
      setHovered({
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: kline ? kline[5] : '0',
        time: ts,
      })
    })

    const observer = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.resize(
          containerRef.current.clientWidth,
          containerRef.current.clientHeight,
        )
      }
    })
    observer.observe(containerRef.current)

    return () => {
      observer.disconnect()
      chart.remove()
      seriesRef.current = null
    }
  }, [])

  // Update data whenever klines change
  useEffect(() => {
    if (!seriesRef.current || !klines.length) return
    seriesRef.current.setData(toChartData(klines))
  }, [klines])

  const isUp = hovered ? hovered.close >= hovered.open : true

  return (
    <div ref={containerRef} className="relative w-full h-full">
      {hovered && (
        <Card className="absolute top-3 left-3 z-10 bg-[#0d1e24]/90 border-[var(--line)] backdrop-blur-sm shadow-lg pointer-events-none">
          <CardContent className="px-3 py-2">
            <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
              <span className="text-[var(--sea-ink-soft)]">O</span>
              <span className="tabular-nums text-[var(--sea-ink-soft)]">{fmt(hovered.open)}</span>
              <span className="text-[var(--sea-ink-soft)]">H</span>
              <span className="tabular-nums text-[#4fb8b2]">{fmt(hovered.high)}</span>
              <span className="text-[var(--sea-ink-soft)]">L</span>
              <span className="tabular-nums text-[#e05c5c]">{fmt(hovered.low)}</span>
              <span className="text-[var(--sea-ink-soft)]">C</span>
              <span className={`tabular-nums font-medium ${isUp ? 'text-[#4fb8b2]' : 'text-[#e05c5c]'}`}>
                {fmt(hovered.close)}
              </span>
              <span className="text-[var(--sea-ink-soft)]">V</span>
              <span className="tabular-nums text-[var(--sea-ink-soft)]">
                {parseFloat(hovered.volume).toLocaleString('en-US', { maximumFractionDigits: 3 })}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
