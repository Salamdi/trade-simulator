import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'

export const Route = createFileRoute('/trade/')({
  component: RouteComponent,
})

type Kline = [number, string, string, string, string, string]

async function fetchKlines(): Promise<Kline[]> {
  const res = await fetch(
    '/api/v3/uiKlines?symbol=BTCUSDT&interval=15m&limit=1000',
  )
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json()
}

function formatDate(ts: number) {
  const d = new Date(ts)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function formatNum(s: string) {
  return parseFloat(s).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
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
      <div className="flex items-center justify-center h-64 text-[var(--sea-ink-soft)] text-sm">
        Loading…
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64 text-red-500 text-sm">
        {error.message}
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-[var(--sea-ink)] mb-4">
        BTC/USDT — 15m
      </h1>
      <div className="overflow-auto rounded-xl border border-[var(--line)] island-shell">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] text-[var(--sea-ink-soft)] text-left">
              {['Date & Time', 'Open', 'High', 'Low', 'Close', 'Volume'].map(
                (col) => (
                  <th
                    key={col}
                    className="px-4 py-3 font-medium whitespace-nowrap"
                  >
                    {col}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {data.map((kline) => {
              const [ts, open, high, low, close, volume] = kline
              const isUp = parseFloat(close) >= parseFloat(open)
              return (
                <tr
                  key={ts}
                  className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--surface)] transition-colors"
                >
                  <td className="px-4 py-2 text-[var(--sea-ink-soft)] whitespace-nowrap">
                    {formatDate(ts)}
                  </td>
                  <td className="px-4 py-2 tabular-nums">{formatNum(open)}</td>
                  <td className="px-4 py-2 tabular-nums text-[var(--palm)]">
                    {formatNum(high)}
                  </td>
                  <td className="px-4 py-2 tabular-nums text-red-500">
                    {formatNum(low)}
                  </td>
                  <td
                    className={`px-4 py-2 tabular-nums font-medium ${isUp ? 'text-[var(--palm)]' : 'text-red-500'}`}
                  >
                    {formatNum(close)}
                  </td>
                  <td className="px-4 py-2 tabular-nums text-[var(--sea-ink-soft)]">
                    {formatNum(volume)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
