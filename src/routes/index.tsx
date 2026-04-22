import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: Home })

function Step({
  n,
  title,
  children,
}: {
  n: number
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="flex gap-4">
      <div className="shrink-0 w-7 h-7 rounded-full bg-[var(--lagoon)] text-white text-xs font-bold flex items-center justify-center mt-0.5">
        {n}
      </div>
      <div>
        <p className="font-semibold text-[var(--sea-ink)] text-sm">{title}</p>
        <p className="text-sm text-[var(--sea-ink-soft)] mt-0.5">{children}</p>
      </div>
    </div>
  )
}

function Home() {
  return (
    <div className="page-wrap py-16 space-y-14">

      {/* Hero */}
      <section className="space-y-4 max-w-2xl">
        <p className="island-kicker">Trading simulator</p>
        <h1 className="display-title text-5xl font-bold text-[var(--sea-ink)] leading-tight">
          Practice trading without risking real money
        </h1>
        <p className="text-lg text-[var(--sea-ink-soft)] leading-relaxed">
          TradeEmulate loads real historical BTC/USDT price data from Binance and
          lets you step forward through time one batch of candles at a time. Place
          buy orders, set take-profit and stop-loss levels, and see how your
          decisions play out — all on past data you haven't seen yet.
        </p>
        <Link
          to="/trade"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-[var(--lagoon)] text-white hover:bg-[var(--lagoon-deep)] transition-colors no-underline mt-2"
        >
          Open simulator →
        </Link>
      </section>

      {/* How it works */}
      <section className="grid md:grid-cols-3 gap-6">
        {[
          {
            title: 'Real historical data',
            body: 'Candles come straight from the Binance API. You start at a fixed point in the past and only see what the market looked like up to that moment.',
          },
          {
            title: 'Step forward blindly',
            body: 'Each click of Forward reveals a new batch of candles — 15 minutes to 24 hours at a time. You never see what\'s coming until you advance.',
          },
          {
            title: 'Automatic order fills',
            body: 'Set a take-profit and stop-loss percentage before buying. As new candles appear, your position closes automatically when a level is hit.',
          },
        ].map(({ title, body }) => (
          <div key={title} className="island-shell feature-card rounded-2xl p-6 space-y-2 border border-[var(--line)]">
            <h3 className="font-semibold text-[var(--sea-ink)]">{title}</h3>
            <p className="text-sm text-[var(--sea-ink-soft)] leading-relaxed">{body}</p>
          </div>
        ))}
      </section>

      {/* User manual */}
      <section className="max-w-2xl space-y-6">
        <h2 className="display-title text-2xl font-bold text-[var(--sea-ink)]">How to use it</h2>
        <div className="space-y-5">
          <Step n={1} title="Open the simulator">
            Navigate to <Link to="/trade">/trade</Link>. The chart loads 1 000
            candles of BTC/USDT (15 m) ending at a fixed historical date. Your
            starting balance is <strong>10 000 USDT</strong>.
          </Step>
          <Step n={2} title="Study the chart">
            Hover any candle to see its open, high, low, close, and volume in the
            top-left tooltip. Scroll left to review earlier price action. The date
            and time — including the day of the week — are shown on the time axis
            when your cursor is over the chart.
          </Step>
          <Step n={3} title="Set your risk parameters">
            Use the <strong className="text-[#4fb8b2]">TP %</strong> and{' '}
            <strong className="text-[#e05c5c]">SL %</strong> inputs in the toolbar
            to choose how much profit to target and how much loss to accept. These
            are locked while a position is open.
          </Step>
          <Step n={4} title="Buy BTC">
            Click <strong>Buy BTC</strong>. Your entire USDT balance is converted
            to BTC at the last candle's close price. A 0.1 % fee is deducted. Take-profit
            and stop-loss prices are set immediately and shown in the toolbar.
          </Step>
          <Step n={5} title="Step forward">
            Select a forward period (15 m – 24 h) then click <strong>Forward →</strong>.
            New candles appear on the right. Each candle is checked in order: if the
            low hits your SL the position closes at a loss; if the high hits your TP
            it closes at a profit. The first level reached wins.
          </Step>
          <Step n={6} title="Review your trade">
            After a fill the toolbar shows your updated USDT balance alongside the
            entry (<strong>Bought</strong>) and exit (<strong>Sold</strong>) prices.
            The line is <span className="text-green-500 font-medium">green</span> for
            a winning trade and <span className="text-red-500 font-medium">red</span> for
            a losing one. You can then buy again and repeat the process.
          </Step>
        </div>
      </section>

      {/* Fee note */}
      <section className="max-w-2xl">
        <div className="island-shell rounded-xl px-5 py-4 border border-[var(--line)] text-sm text-[var(--sea-ink-soft)] leading-relaxed">
          <strong className="text-[var(--sea-ink)]">Fee:</strong> every order —
          buy, take-profit fill, and stop-loss fill — costs <strong>0.1 %</strong> of
          the total transaction value, matching a typical spot exchange fee.
        </div>
      </section>

    </div>
  )
}
