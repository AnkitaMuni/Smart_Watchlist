// Core domain types — shared across all layers. No `any` anywhere.

export interface MarketQuote {
  symbol: string;
  price: number;
  changePercent: number;
  change: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  prevClose: number;
  week52High: number;
  week52Low: number;
  timestamp: number;
  isMarketOpen: boolean;
}

export interface PricePoint {
  timestamp: number;
  price: number;
  volume: number;
}

export interface PriceHistory {
  symbol: string;
  points: PricePoint[];
}

export interface SymbolSnapshot {
  symbol: string;
  price: number;
  volume: number;
  changePercent: number;
  week52High: number;
  week52Low: number;
  timestamp: number;
}

export interface Watchlist {
  id: string;
  name: string;
  createdAt: number;
}

export interface WatchlistEntry {
  id: string;
  watchlistId: string;
  symbol: string;
  addedAt: number;
}

export interface LastViewedRecord {
  symbol: string;
  lastViewedAt: number;
  lastPrice: number;
  lastVolume: number;
  lastChangePercent: number;
  lastWeek52High: number;
  lastWeek52Low: number;
}

export type ScoreReason =
  | 'price-move'
  | 'volume-spike'
  | 'direction-reversal'
  | 'new-52-high'
  | 'new-52-low'
  | 'gap-hold'
  | 'gap-fade';

export interface SubScore {
  type: ScoreReason;
  score: number;
  reason: string;
}

export interface ChangeScore {
  symbol: string;
  compositeScore: number;
  subScores: SubScore[];
  topReason: string;
  priceChangePercent: number;
  currentPrice: number;
  lastSeenPrice: number;
  lastSeenAt: number;
  currentVolume: number;
  averageVolume: number;
}

export type DataState = 'live' | 'cached' | 'stale' | 'unavailable' | 'market-closed';

export interface QuoteWithState {
  quote: MarketQuote | null;
  state: DataState;
  stateMessage: string;
}

export interface ScoringConfig {
  weights: {
    priceMove: number;
    volumeSpike: number;
    directionReversal: number;
    newHigh: number;
    newLow: number;
    gapHold: number;
    gapFade: number;
  };
  volumeSpikeThreshold: number;
  minHistoryForVolatility: number;
}

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  weights: {
    priceMove: 0.35,
    volumeSpike: 0.20,
    directionReversal: 0.15,
    newHigh: 0.10,
    newLow: 0.10,
    gapHold: 0.05,
    gapFade: 0.05,
  },
  volumeSpikeThreshold: 2.0,
  minHistoryForVolatility: 5,
};
