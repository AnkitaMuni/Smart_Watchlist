# Smart Watchlist — Code by Groww Hackathon Build

**Smart Watchlist** is an intelligent market watchlist & change detection platform that doesn't just display static stock prices — it actively analyzes, scores, and surfaces what has *meaningfully changed* since you last checked. Powered by a pluggable 7-factor volatility-adjusted scoring engine, live Finnhub REST API streaming, Supabase Cloud Postgres persistence, and AI market narratives.

---

## ⚡ Quick Setup & Running Locally

### Prerequisites
- Node.js 18+ and npm

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/AnkitaMuni/Code-By-Grow.git
cd Code-By-Grow

# 2. Install dependencies
npm install

# 3. Set up environment variables (Optional — falls back to built-in proxy)
# Create a .env file:
# VITE_FINNHUB_API_KEY=your_finnhub_key
# VITE_SUPABASE_URL=your_supabase_url
# VITE_SUPABASE_ANON_KEY=your_supabase_key

# 4. Start the development server
npm run dev

# 5. Open http://localhost:5173
```

### Running Tests

```bash
npm test          # Run vitest suite once
npm run test:watch  # Run tests in watch mode
```

### Production Build

```bash
npm run build     # Type-check + compile Vite production bundle
```

---

## 🌟 Key Features & Implementation Highlights

### 1. 🤖 AI Executive Market Narrative
- Synthesizes all live quotes into a 2-sentence plain-English market briefing.
- Automatically determines market sentiment (**Bullish**, **Bearish**, or **Neutral**), highlights top movers, advancing/declining ratios, and surface catalyst badges.

### 2. ⚡ Volatility-Adjusted Change Scoring Engine
- Implements a pure-function composite scoring algorithm (`computeCompositeScore`) across 7 distinct sub-scores:
  - **Price Z-Score (35%)**: Measures percentage move against rolling volatility standard deviation (normalizing high-volatility vs calm stocks).
  - **Volume Anomaly (20%)**: Flags abnormal volume surges exceeding 2x historical average.
  - **Direction Reversal (15%)**: Detects trend changes (reversing up/down after a trend).
  - **52-Week High / Low (10% each)**: Extreme price level breaches.
  - **Gap-and-Hold / Gap-and-Fade (5% each)**: Opening gap sustainability analysis.

### 3. 🔍 Smart Filters & Baseline Time-Machine
- **Alert Sensitivity Controls**: Filter by `All Moves`, `>1% Moderate`, or `>3% High Volatility`.
- **Baseline Selector**: Compare deltas against `Last Seen` (session snapshot), `Prev Close` (daily reference), or `Day Open` (intraday reference).

### 4. 🗄️ Dual Cloud + Local Persistence Engine
- **Supabase Cloud Postgres**: Syncs watchlists (`watchlists`), symbol entries (`watchlist_symbols`), snapshots (`symbol_snapshots`), and user sessions (`sessions`) live to Supabase.
- **Dexie IndexedDB**: Local in-browser storage layer providing zero-latency UI responsiveness and seamless offline fallback.

### 5. 🔔 Custom Price & Volume Alerts
- Allows users to set target price triggers (`Price > Target`, `Price < Target`, `Gain > Target %`, `Loss > Target %`).
- Evaluates live quotes every 30s and displays yellow `TRIGGERED 🔔` badges upon threshold breaches.

### 6. 📊 Multi-Watchlist Side-by-Side Comparison
- Compare any two watchlists side-by-side (e.g. *My Watchlist* vs *Tech Stocks*).
- Displays comparative average performance, advancers/decliners breakdown, and side-by-side stock matrices.

### 7. 🔍 Autocomplete Stock Dropdown & Quick-Add Pills
- Search dropdown displaying ticker symbols alongside full company names (`AAPL — Apple Inc.`, `NVDA — NVIDIA Corporation`).
- One-click **Quick-Add** preset pills (`+ AAPL`, `+ MSFT`, `+ NVDA`, `+ TSLA`).

### 8. 🌐 Global Market Pulse & Ticker Bar
- Horizontal live ticker stream tracking global market benchmarks (`AAPL`, `MSFT`, `NVDA`, `AMZN`, `GOOGL`, `TSLA`, `META`, `AMD`).

### 9. 🎨 Volatility Heatmap Grid & Density Switcher
- **Heatmap Grid**: Visual color-gradient matrix highlighting market gainers (emerald) and losers (rose).
- **Density Switcher**: Toggle between `Standard` view and `Compact` high-density row view.

### 10. 📊 Interactive Price Chart & Event Markers
- Detailed price history charts (1D, 1W, 1M, 3M, 1Y) with peak **High** and **Low** reference boundary markers.

### 11. 📁 Watchlist Import & Export
- One-click **Export** to JSON backup.
- **Import** function for bulk loading stock lists from JSON/CSV files.

### 12. 🛡️ Architecture & Telemetry Modal
- In-app System Health & Architecture Modal showing live API latency, database connection status, in-memory cache hit ratios, and interactive architecture flow diagrams for hackathon judges.

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            UI Layer (src/ui/)                               │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────────────────┐  │
│  │ ExecutiveSummary │  │ WhatChangedPanel │  │ VolatilityHeatmap / Table │  │
│  └────────┬─────────┘  └────────┬─────────┘  └─────────────┬─────────────┘  │
│           │                     │                          │                │
│           └─────────────────────┴──────────────────────────┘                │
├─────────────────────────────────────────────────────────────────────────────┤
│                          Hooks Layer (src/hooks/)                           │
│     TanStack Query orchestration: 30s auto-polling, TTL caching,            │
│     stale-while-revalidate, optimistic updates                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                   │                                 │                       │
│    ┌──────────────┴───────────────┐         ┌───────┴──────────────────┐    │
│    │  Scoring Engine (src/scoring)│         │ Data Proxy Layer         │    │
│    │  Pure-function composite    │         │ Serverless Proxy         │    │
│    │  change detection algorithms │         │ (/api/quotes) + Finnhub  │    │
│    └──────────────────────────────┘         └─────────┬────────────────┘    │
│                                                       │                     │
├───────────────────────────────────────────────────────┼─────────────────────┤
│                       Dual Persistence Layer          │                     │
│                       (src/db/index.ts)               │                     │
│   ┌──────────────────────────────────┐  ┌─────────────┴─────────────────┐   │
│   │ Supabase Cloud Postgres Database │  │ Dexie.js (IndexedDB Local DB) │   │
│   └──────────────────────────────────┘  └───────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📜 Submission Pitch (Code by Groww)

Smart Watchlist transforms stock tracking into an intelligent signal engine. Instead of staring at static price tables, users immediately see what *meaningfully changed* since they last checked. Using a volatility-adjusted z-score composite engine (35% price z-score, 20% volume anomaly, 15% trend reversal, 52-week extremes, gap patterns), the system separates signal from noise—so a 3% move for a calm stock scores higher than the same move for a volatile one. 

Built with enterprise resilience: a serverless API proxy protects Finnhub API keys and manages rate limits, a dual persistence layer combines Supabase Cloud Postgres with local Dexie IndexedDB for zero-latency offline operation, and automated AI market narratives surface key takeaways instantly.
