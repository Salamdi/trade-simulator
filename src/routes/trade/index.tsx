import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { CandlestickChart } from '#/components/CandlestickChart'

export const Route = createFileRoute('/trade/')({
  component: RouteComponent,
})

type Kline = [number, string, string, string, string, string]

async function fetchKlines(): Promise<Kline[]> {
  const res = await fetch(
    '/api/v3/uiKlines?symbol=BTCUSDT&interval=15m&limit=1000&endTime=1640995200000',
  )
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json()
}


function RouteComponent() {
  const { data, isPending, isError, error } = useQuery({
    queryKey: ['uiKlines', 'BTCUSDT', '15m'],
    queryFn: fetchKlines,
    staleTime: 0,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
    refetchOnReconnect: false,
  })

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
    <div className="w-full h-screen">
      <CandlestickChart klines={data} />
    </div>
  )
}
