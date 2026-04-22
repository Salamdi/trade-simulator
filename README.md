# TradeEmulate

A historical trading simulator built with TanStack Start. Load a BTC/USDT candlestick chart from Binance, step forward through time candle by candle, place buy orders, and watch take-profit / stop-loss levels execute automatically as new candles arrive.

## What it does

- Renders a full-screen BTC/USDT candlestick chart (15m interval) using [lightweight-charts](https://tradingview.github.io/lightweight-charts/)
- Loads 1 000 candles of historical data ending at a fixed point in time — you start blind to what happens next
- **Forward** button advances the chart by a configurable period (15 m → 24 h), revealing new candles one batch at a time
- **Buy BTC** converts your entire USDT balance into BTC at the last close price
- **Take profit** (configurable %) and **stop loss** (configurable %) are set automatically on buy and checked against each new candle's high/low as you step forward
- A 0.1 % fee is deducted on every order (buy, TP fill, SL fill)
- Hover any candle to see a tooltip with date, open, high, low, close, and volume
- Binance API calls are proxied through a TanStack Start server function — no client-side CORS issues

## Getting started

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000/trade](http://localhost:3000/trade).

## How to use

### Starting balances

You begin with **10 000 USDT** and **0 BTC**.

### Stepping through time

Click **Forward →** to load the next batch of candles. Use the period selector to control how many candles each click reveals:

| Button | Candles revealed |
|--------|-----------------|
| 15m    | 1               |
| 1h     | 4               |
| 3h     | 12              |
| 6h     | 24              |
| 12h    | 48              |
| 24h    | 96              |

Scroll left on the chart at any time to review past candles.

### Placing a trade

1. Adjust **TP %** and **SL %** inputs to your desired levels (defaults: 0.5 % / 10 %).
2. Click **Buy BTC** — your entire USDT balance converts to BTC at the current last close price minus a 0.1 % fee.
3. TP and SL target prices appear in the toolbar.

```
Balance:  USDT 0.00  |  BTC 0.214831
TP 47,234.50  |  SL 42,210.00
```

### Take profit & stop loss

As you click **Forward →**, each new candle is checked in order:

- If the candle's **low** touches or crosses the SL price → position closes at the SL price.
- If the candle's **high** touches or crosses the TP price → position closes at the TP price.

The first trigger wins. After a fill the USDT balance is updated (net of the 0.1 % fee) and both levels are cleared.

The **Bought / Sold** line below the toolbar shows the last entry and exit prices. It turns **green** on a profitable close (TP) and **red** on a loss (SL).

### Reading the OHLCV tooltip

Hover any candle to see a floating card in the top-left corner of the chart:

```
Mon, Jan 03, 2022, 14:00
O  46,412.50
H  46,890.00   ← green
L  46,100.25   ← red
C  46,734.00   ← colored by direction
V  1,204.873
```

## Project structure

```
src/
├── components/
│   ├── CandlestickChart.tsx   # lightweight-charts wrapper with OHLCV tooltip
│   └── ui/                    # shadcn/ui components
├── routes/
│   └── trade/
│       └── index.tsx          # main trading simulator page
├── server/
│   └── binance.ts             # server function proxying Binance API calls
└── styles.css                 # global styles & CSS variables
```

## Tech stack

| Concern | Library |
|---------|---------|
| Framework | [TanStack Start](https://tanstack.com/start) (SSR, server functions) |
| Routing | [TanStack Router](https://tanstack.com/router) (file-based) |
| Data fetching | [TanStack Query](https://tanstack.com/query) |
| Chart | [lightweight-charts v5](https://tradingview.github.io/lightweight-charts/) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) |
| Deployment | [Cloudflare Workers](https://workers.cloudflare.com/) via Wrangler |

## Scripts

```bash
pnpm dev          # start dev server on :3000
pnpm build        # production build
pnpm preview      # preview production build locally
pnpm deploy       # build + deploy to Cloudflare Workers
pnpm test         # run unit tests with Vitest
pnpm check        # format + lint
```

## Adding shadcn/ui components

```bash
pnpm dlx shadcn@latest add button
```
