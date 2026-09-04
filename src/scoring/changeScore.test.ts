import { describe, it, expect } from 'vitest';
import { computeChangeScore } from './changeScore';

describe('computeChangeScore', () => {
  it('returns score 0 when no last viewed snapshot exists', () => {
    const result = computeChangeScore({
      symbol: 'AAPL',
      currentPrice: 180,
      currentVolume: 1000000,
      historicalDailyReturns: [0.01, -0.01, 0.005],
      rollingAvgVolume: 1000000,
      week52High: 200,
      week52Low: 150,
    });

    expect(result.score).toBe(0);
    expect(result.isSignificant).toBe(false);
  });

  it('detects a statistically significant price spike exceeding 2 std devs', () => {
    const result = computeChangeScore({
      symbol: 'AAPL',
      currentPrice: 210, // ~16.6% jump from 180
      currentVolume: 1000000,
      lastViewedSnapshot: { price: 180, volume: 1000000, timestamp: Date.now() - 3600000 },
      historicalDailyReturns: [0.01, -0.01, 0.005, -0.005], // std dev ~ 0.007
      rollingAvgVolume: 1000000,
      week52High: 220,
      week52Low: 140,
    });

    expect(result.score).toBeGreaterThanOrEqual(40);
    expect(result.isSignificant).toBe(true);
    expect(result.reasons[0]).toContain('statistically unusual move');
  });

  it('detects volume anomaly when volume is 2x+ over average', () => {
    const result = computeChangeScore({
      symbol: 'GOOGL',
      currentPrice: 150,
      currentVolume: 3000000, // 3x average
      lastViewedSnapshot: { price: 150, volume: 1000000, timestamp: Date.now() - 3600000 },
      historicalDailyReturns: [0.001, -0.001],
      rollingAvgVolume: 1000000,
      week52High: 180,
      week52Low: 120,
    });

    expect(result.score).toBeGreaterThanOrEqual(30);
    expect(result.reasons[0]).toContain('Volume spike detected');
  });
});