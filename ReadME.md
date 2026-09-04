# Smart Watchlist

**Smart Watchlist** is a market watchlist tool that doesn't just track stocks — it actively tells you what has *meaningfully changed* since you last checked, and what deserves your attention right now. Instead of a static price table, you get a ranked "What Changed" panel with human-readable explanations of why each move matters, powered by a pluggable volatility-adjusted scoring engine.

---

## Setup Instructions

### Prerequisites
- Node.js 18+ and npm

### Install and Run

```bash
# 1. Clone the repo
git clone <repo-url>
cd smart-watchlist

# 2. Install dependencies
npm install

# 3. Set up environment variables (optional — app works with mock data by default)
cp .env.example .env
# Edit .env to add a Finnhub API key if you want live data

# 4. Run the dev server
npm run dev

# 5. Open the app
# Vite will print a local URL (typically http://localhost:5173)
```

### Running Tests

```bash
npm test          # run scoring tests once
npm run test:watch  # run in watch mode
```

### Building for Production

```bash
npm run build     # type-check + build to dist/
npm run preview   # preview the production build
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    UI Layer (src/ui/)                │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ Dashboard │  │ WhatChanged  │  │ SymbolDetail │  │
│  │  (App.tsx) │  │   Panel      │  │   (Modal)    │  │
│  └─────┬─────┘  └──────┬───────┘  └──────┬───────┘  │
│        │               │                 │          │
│        └───────────────┴─────────────────┘          │
│                        │                            │
├────────────────────────┼────────────────────────────┤
│              Hooks Layer (src/hooks/)                │
│   TanStack Query orchestration: polling, caching,   │
│   stale-while-revalidate, auto-refetch on focus      │
├────────────────────────┼────────────────────────────┤
│                        │                            │
│         ┌──────────────┴───────────────┐            │
│         │                              │            │
│  ┌──────┴───────┐              ┌───────┴──────┐    │
│  │ Scoring Engine│              │  Data Layer  │    │
│  │ (src/scoring/)│              │ (src/data/)  │    │
│  │               │              │              │    │
│  │ Pure functions│              │ Provider     │    │
│  │ for change    │              │ interface +  │    │
│  │ detection     │              │ Mock + TTL   │    │
│  │ (tested)      │              │ cache        │    │
│  └───────────────┘              └──────┬───────┘    │
│                                        │            │
├────────────────────────────────────────┼────────────┤
│                           Persistence Layer        │
│                           (src/db/ — Dexie/        │
│                           IndexedDB)               │
│   watchlists | entries | lastViewed | snapshots    │
└─────────────────────────────────────────────────────┘
```

### Data Flow

1. **User opens the app** → Dexie initializes IndexedDB, a default watchlist is created if none exists.
2. **User adds symbols** → validated against the market data provider, stored in IndexedDB.
3. **Quotes are fetched** → TanStack Query polls every 30s, the TTL cache deduplicates and batches requests, stale data is served from cache if the provider fails.
4. **"What Changed" computes** → for each symbol, the scoring engine compares the current quote against the stored `lastViewed` snapshot, producing a composite score from 7 sub-scores (price z-score, volume anomaly, direction reversal, 52-week high/low, gap patterns).
5. **After 10 seconds** → the current state is saved as the new `lastViewed` baseline, so the panel resets for the next visit.
6. **User clicks a symbol** → detail modal shows price chart, key stats, and the full sub-score breakdown explaining why it appeared in the "What Changed" panel.

---

## Design Decisions & Trade-offs

### What "Meaningful Change" Means in This Build

A price tick is not meaningful. A 3% move for a low-volatility stock is; the same 3% for a high-volatility stock is noise. The scoring engine separates signal from noise using a **composite of 7 sub-scores**, each normalized to 0–1 and weighted:

| Signal | Weight | What It Detects |
|--------|--------|----------------|
| **Price z-score** | 35% | Percentage move divided by the symbol's rolling volatility standard deviation. A 4% move for a stock with 1% typical volatility scores far higher than the same move for a stock with 5% volatility. |
| **Volume anomaly** | 20% | Current volume vs. rolling average. Flags when volume exceeds 2x the historical mean. |
| **Direction reversal** | 15% | Detects trend changes — a stock that was trending down and just reversed up (or vice versa). |
| **52-week high/low** | 10% each | Binary signal when a new 52-week extreme is crossed since last check. |
| **Gap-and-hold** | 5% | An opening gap that was sustained — a stronger signal than a gap that faded. |
| **Gap-and-fade** | 5% | An opening gap that reversed — signals a failed breakout/breakdown. |

The scoring module is **pluggable**: all sub-scorers are pure functions in `src/scoring/index.ts` with zero external dependencies. Weights are configurable via `ScoringConfig`. The algorithm is isolated from the UI layer — the UI just renders scores, it doesn't compute them.

**Time-gap awareness**: The z-score naturally handles different time gaps because volatility scales with the square root of time. A 4% move over 3 weeks is normal for many stocks; the same move in 3 minutes produces a much higher z-score relative to per-period volatility. No special-casing needed.

### How State Persists Across Sessions/Devices

**IndexedDB via Dexie.js** is used for persistence. This was chosen because no remote database was provisioned in this environment. IndexedDB is the browser equivalent of SQLite — it's structured, queryable, transactional, and survives reloads and device restarts. Unlike localStorage, it handles large datasets and complex queries.

The persistence layer is behind a **repository interface** (`src/db/index.ts`) so the storage backend is swappable — replacing Dexie with a Supabase or other remote database only requires changing this one file. The schema tracks:

- `watchlists` — named lists per user
- `entries` — symbols in each watchlist (with a compound index for duplicate prevention)
- `lastViewed` — per-symbol timestamp + price/volume snapshot of when the user last checked
- `snapshots` — historical price snapshots used for volatility computation

**Auth approach**: Guest-only (no forced signup). A local session is created automatically. The README's "Known Limitations" section notes that adding Supabase Auth would enable cross-device sync.

### How Stale/Conflicting Data Is Handled

The `QuoteCache` layer (`src/data/cache.ts`) implements a multi-tier freshness strategy:

- **TTL cache**: Quotes are cached for 30 seconds. History for 5 minutes. Within the TTL, cached data is served instantly.
- **Stale-but-usable**: If the cache is older than the TTL but less than 4x the TTL, the data is still served with a visible "Cached" badge and a "prices as of X min ago" message.
- **Freshness wins**: When fresh data arrives, it always overwrites cached data. The `timestamp` field on each quote is the source of truth.
- **Graceful degradation**: If the provider fails entirely, the last known good data is shown with a "Stale" badge. If no data exists at all, a clear "Data unavailable" state is shown — never a crash.
- **Market closed**: The provider detects market hours and marks data as "Closed" — the UI shows a distinct badge so users know they're looking at last-close, not live, data.

### How the System Would Scale

This is a monolith with clean module boundaries — the right call for a hackathon. At real scale:

1. **Background workers / cron** would poll market data APIs on a schedule and write to a shared store (Postgres/Redis), decoupling data fetching from user requests.
2. **WebSocket fan-out** would replace client polling — the server pushes updates to connected clients instead of each client polling every 30s.
3. **Shared cache** (Redis) would replace the in-process TTL cache, so 1,000 users watching AAPL share one API call's result.
4. **Sharding by symbol** would distribute the market data workload across workers.
5. **Incremental scoring** (already implemented) means the "what changed" computation diffs against the last snapshot rather than recomputing from full history — this scales to large watchlists.
6. **UI virtualization** (already implemented) handles 50+ symbol watchlists without rendering every row.

### Where Complexity Was Deliberately Kept Low

- **No microservices, no Kafka, no distributed system.** A monolith with clean module boundaries (`data/`, `scoring/`, `db/`, `hooks/`, `ui/`) is the right architecture for this scope.
- **No custom auth system.** Guest-only with local persistence. Adding Supabase email/password auth would be a small, well-scoped addition.
- **Mock data generator** instead of a live API by default. The provider interface means swapping in a real API is a one-line config change. The mock produces realistic price movement (random walk + volatility spikes + volume anomalies) so the scoring engine has something meaningful to detect.
- **No server-side rendering.** A client-side SPA is sufficient for a dashboard tool.

---

## Known Limitations / What I'd Do With More Time

1. **Cross-device sync**: Add Supabase Auth + remote database so watchlists and last-viewed state sync across devices.
2. **Live market data**: Wire up a real Finnhub/Alpha Vantage API key — the `FinnhubProvider` stub is ready.
3. **WebSocket real-time updates**: Replace 30s polling with a WebSocket connection for instant price updates.
4. **Configurable scoring weights**: Expose the `ScoringConfig` in the UI so users can tune what "meaningful" means to them.
5. **Alerts/notifications**: Push notifications when a symbol crosses a significance threshold.
6. **More gap/reversal patterns**: Add more sophisticated pattern detection (e.g., support/resistance breaks, moving average crossovers).
7. **Code splitting**: The production bundle is 700KB; lazy-loading the chart library and detail modal would reduce initial load.

---

## Product Pitch

Smart Watchlist doesn't just show prices — it tells you what matters. When you return after hours or days, a ranked panel surfaces only meaningful changes: "AAPL up 4.2% on 3x volume — largest move in 30 days." A volatility-adjusted z-score separates signal from noise, so a 3% move for a calm stock scores higher than the same move for a volatile one. Seven sub-scores (price, volume, reversal, 52-week extremes, gap patterns) combine into one ranked list. Mock data generates realistic movement so the logic always demos. Built as a clean monolith: pure-function scoring, swappable data providers, IndexedDB persistence, and a virtualized UI that handles 50+ symbols without breaking a sweat.
