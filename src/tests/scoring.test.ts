import { describe, it, expect } from 'vitest';
import {
  computeVolatility,
  computeAverageVolume,
  scorePriceMove,
  scoreVolumeAnomaly,
  scoreDirectionReversal,
  score52WeekHigh,
  score52WeekLow,
  scoreGapPattern,
  computeCompositeScore,
  rankChanges,
} from '../scoring';
import type { PricePoint, MarketQuote, LastViewedRecord } from '../types';

function makeHistory(prices: number[], baseVol: number = 1000000): PricePoint[] {
  const now = Date.now();
  return prices.map((price, i) => ({
    timestamp: now - (prices.length - i) * 3600000,
    price,
    volume: baseVol + Math.random() * 100000,
  }));
}

function makeQuote(symbol: string, price: number, volume: number = 1000000): MarketQuote {
  return {
    symbol,
    price,
    changePercent: 0,
    change: 0,
    volume,
    high: price * 1.05,
    low: price * 0.95,
    open: price * 0.99,
    prevClose: price * 0.98,
    week52High: price * 1.3,
    week52Low: price * 0.7,
    timestamp: Date.now(),
    isMarketOpen: true,
  };
}

function makeLastViewed(symbol: string, price: number, volume: number = 1000000): LastViewedRecord {
  return {
    symbol,
    lastViewedAt: Date.now() - 86400000,
    lastPrice: price,
    lastVolume: volume,
    lastChangePercent: 0,
    lastWeek52High: price * 1.2,
    lastWeek52Low: price * 0.8,
  };
}

describe('computeVolatility', () => {
  it('returns 0 for fewer than 2 points', () => {
    expect(computeVolatility([])).toBe(0);
    expect(computeVolatility([{ timestamp: 1, price: 100, volume: 1 }])).toBe(0);
  });

  it('returns 0 for constant prices', () => {
    const h = makeHistory([100, 100, 100, 100]);
    expect(computeVolatility(h)).toBe(0);
  });

  it('returns positive value for varying prices', () => {
    const h = makeHistory([100, 105, 102, 108, 103]);
    expect(computeVolatility(h)).toBeGreaterThan(0);
  });
});

describe('computeAverageVolume', () => {
  it('returns 0 for empty history', () => {
    expect(computeAverageVolume([])).toBe(0);
  });

  it('returns the mean of volumes', () => {
    const h = [
      { timestamp: 1, price: 100, volume: 200 },
      { timestamp: 2, price: 101, volume: 400 },
    ];
    expect(computeAverageVolume(h)).toBe(300);
  });
});

describe('scorePriceMove', () => {
  it('returns 0 score when no previous price', () => {
    const result = scorePriceMove(100, 0, makeHistory([100, 101]));
    expect(result.score).toBe(0);
  });

  it('scores a large move with low volatility higher than same move with high volatility', () => {
    const lowVolHistory = makeHistory([100, 100.5, 100.2, 100.3, 100.1]);
    const highVolHistory = makeHistory([100, 110, 95, 108, 92]);
    const lowVolScore = scorePriceMove(106, 100, lowVolHistory);
    const highVolScore = scorePriceMove(106, 100, highVolHistory);
    expect(lowVolScore.score).toBeGreaterThan(highVolScore.score);
  });

  it('describes direction correctly', () => {
    const up = scorePriceMove(105, 100, makeHistory([100, 100.5, 101]));
    expect(up.reason).toContain('Up');
    const down = scorePriceMove(95, 100, makeHistory([100, 99.5, 99]));
    expect(down.reason).toContain('Down');
  });
});

describe('scoreVolumeAnomaly', () => {
  it('returns 0 when no volume history', () => {
    const result = scoreVolumeAnomaly(1000000, [], 2.0);
    expect(result.score).toBe(0);
  });

  it('returns 0 for normal volume', () => {
    const h = makeHistory([100, 101, 102], 1000000);
    const result = scoreVolumeAnomaly(1100000, h, 2.0);
    expect(result.score).toBe(0);
  });

  it('scores high volume as anomaly', () => {
    // Use fixed volumes to get deterministic ratio
    const h = [
      { timestamp: 1, price: 100, volume: 1000000 },
      { timestamp: 2, price: 101, volume: 1000000 },
      { timestamp: 3, price: 102, volume: 1000000 },
    ];
    const result = scoreVolumeAnomaly(3000000, h, 2.0);
    expect(result.score).toBeGreaterThan(0);
    expect(result.reason).toContain('3.0x');
  });
});

describe('scoreDirectionReversal', () => {
  it('returns 0 for insufficient history', () => {
    const h = makeHistory([100, 101]);
    const result = scoreDirectionReversal(h, 100, 105);
    expect(result.score).toBe(0);
  });

  it('detects upward reversal after downtrend', () => {
    const h = makeHistory([110, 108, 105, 102, 100]);
    const result = scoreDirectionReversal(h, 100, 105);
    expect(result.score).toBeGreaterThan(0);
    expect(result.reason).toContain('upward');
  });

  it('detects downward reversal after uptrend', () => {
    const h = makeHistory([90, 95, 100, 105, 110]);
    const result = scoreDirectionReversal(h, 110, 105);
    expect(result.score).toBeGreaterThan(0);
    expect(result.reason).toContain('downward');
  });

  it('returns 0 when no reversal', () => {
    const h = makeHistory([90, 95, 100, 105, 110]);
    const result = scoreDirectionReversal(h, 110, 115);
    expect(result.score).toBe(0);
  });
});

describe('score52WeekHigh', () => {
  it('scores 1 when new high is reached', () => {
    const result = score52WeekHigh(155, 155, 140);
    expect(result.score).toBe(1);
    expect(result.reason).toContain('52-week high');
  });

  it('returns 0 when no new high', () => {
    const result = score52WeekHigh(100, 150, 140);
    expect(result.score).toBe(0);
  });
});

describe('score52WeekLow', () => {
  it('scores 1 when new low is reached', () => {
    const result = score52WeekLow(45, 45, 60);
    expect(result.score).toBe(1);
    expect(result.reason).toContain('52-week low');
  });

  it('returns 0 when no new low', () => {
    const result = score52WeekLow(100, 50, 60);
    expect(result.score).toBe(0);
  });
});

describe('scoreGapPattern', () => {
  it('returns 0 for small gaps', () => {
    const h = makeHistory([100, 101, 102]);
    const result = scoreGapPattern(h, 100, 101);
    expect(result.score).toBe(0);
  });

  it('detects gap-and-hold for upward gap', () => {
    const h = makeHistory([100, 100, 100, 106, 106]);
    const result = scoreGapPattern(h, 100, 106);
    expect(result.type).toBe('gap-hold');
    expect(result.score).toBeGreaterThan(0);
  });
});

describe('computeCompositeScore', () => {
  it('returns 0 score when no last viewed record', () => {
    const quote = makeQuote('AAPL', 150);
    const result = computeCompositeScore(quote, null, makeHistory([150, 151]));
    expect(result.compositeScore).toBe(0);
    expect(result.topReason).toContain('No previous view');
  });

  it('computes a positive composite score for a significant move', () => {
    const quote = makeQuote('AAPL', 160, 3000000);
    quote.week52High = 160;
    const lastViewed = makeLastViewed('AAPL', 150, 1000000);
    lastViewed.lastWeek52High = 155;
    const history = makeHistory([150, 150.5, 151, 150.2, 150.8, 151.2, 150.9, 151, 150.5, 151.3]);
    const result = computeCompositeScore(quote, lastViewed, history);
    expect(result.compositeScore).toBeGreaterThan(0);
    expect(result.priceChangePercent).toBeCloseTo(((160 - 150) / 150) * 100, 1);
    expect(result.subScores.length).toBeGreaterThan(0);
  });

  it('returns 0 for no change', () => {
    const quote = makeQuote('AAPL', 150, 1000000);
    const lastViewed = makeLastViewed('AAPL', 150, 1000000);
    const history = makeHistory([150, 150, 150, 150, 150]);
    const result = computeCompositeScore(quote, lastViewed, history);
    expect(result.compositeScore).toBe(0);
  });
});

describe('rankChanges', () => {
  it('sorts by composite score descending', () => {
    const scores = [
      { symbol: 'A', compositeScore: 0.3, subScores: [], topReason: '', priceChangePercent: 0, currentPrice: 0, lastSeenPrice: 0, lastSeenAt: 0, currentVolume: 0, averageVolume: 0 },
      { symbol: 'B', compositeScore: 0.8, subScores: [], topReason: '', priceChangePercent: 0, currentPrice: 0, lastSeenPrice: 0, lastSeenAt: 0, currentVolume: 0, averageVolume: 0 },
      { symbol: 'C', compositeScore: 0.5, subScores: [], topReason: '', priceChangePercent: 0, currentPrice: 0, lastSeenPrice: 0, lastSeenAt: 0, currentVolume: 0, averageVolume: 0 },
    ];
    const ranked = rankChanges(scores);
    expect(ranked[0].symbol).toBe('B');
    expect(ranked[1].symbol).toBe('C');
    expect(ranked[2].symbol).toBe('A');
  });
});
