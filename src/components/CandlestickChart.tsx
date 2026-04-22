import { useEffect, useRef } from 'react'
import { createChart, CandlestickSeries, ColorType, type Time } from 'lightweight-charts'

type Kline = [number, string, string, string, string, string]

export function CandlestickChart({ klines }: { klines: Kline[] }) {
  const containerRef = useRef<HTMLDivElement>(null)

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

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#4fb8b2',
      downColor: '#e05c5c',
      borderUpColor: '#4fb8b2',
      borderDownColor: '#e05c5c',
      wickUpColor: '#4fb8b2',
      wickDownColor: '#e05c5c',
    })

    series.setData(
      klines.map(([ts, open, high, low, close]) => ({
        time: (ts / 1000) as Time,
        open: parseFloat(open),
        high: parseFloat(high),
        low: parseFloat(low),
        close: parseFloat(close),
      })),
    )

    chart.timeScale().fitContent()

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
    }
  }, [klines])

  return <div ref={containerRef} className="w-full h-full" />
}
