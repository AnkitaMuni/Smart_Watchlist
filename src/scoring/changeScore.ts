export interface Snapshot {
  price: number;
  volume: number;
  timestamp: number;
}

export interface ScoreInput {
  symbol: string;
  currentPrice: number;
  currentVolume: number;
  lastViewedSnapshot?: Snapshot;
  historicalDailyReturns: number[]; // e.g. [0.01, -0.02, 0.005, ...]
  rollingAvgVolume: number;
  week52High: number;
  week52Low: number;
}

export interface ScoreResult {
  symbol: string;
  score: number; // 0 to 100
  isSignificant: boolean;
  reasons: string[];
}

function calculateStandardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

export function computeChangeScore(input: ScoreInput): ScoreResult {
  const reasons: string[] = [];
  let score = 0;

  if (!input.lastViewedSnapshot) {
    return {
      symbol: input.symbol,
      score: 0,
      isSignificant: false,
      reasons: ['Initial baseline recorded; watching for updates.'],
    };
  }

  const { price: prevPrice, volume: prevVolume } = input.lastViewedSnapshot;
  const priceChangePct = (input.currentPrice - prevPrice) / prevPrice;

  // 1. Statistical Price Volatility Anomaly (> 2 Standard Deviations)
  const stdDev = calculateStandardDeviation(input.historicalDailyReturns);
  if (stdDev > 0 && Math.abs(priceChangePct) > 2 * stdDev) {
    const direction = priceChangePct > 0 ? 'surged' : 'dropped';
    const percentStr = (Math.abs(priceChangePct) * 100).toFixed(1);
    reasons.push(`${input.symbol} ${direction} ${percentStr}% (statistically unusual move)`);
    score += 40;
  } else if (Math.abs(priceChangePct) >= 0.02) {
    const percentStr = (priceChangePct * 100).toFixed(1);
    reasons.push(`Price changed by ${percentStr}% since last check`);
    score += 15;
  }

  // 2. Volume Anomaly (2x or higher vs rolling average)
  if (input.rollingAvgVolume > 0 && input.currentVolume >= 2 * input.rollingAvgVolume) {
    const volumeRatio = (input.currentVolume / input.rollingAvgVolume).toFixed(1);
    reasons.push(`Volume spike detected: ${volumeRatio}x over 14-day average`);
    score += 30;
  }

  // 3. 52-Week High / Low Breaches
  if (input.currentPrice >= input.week52High) {
    reasons.push(`Hit a new 52-week high ($${input.currentPrice.toFixed(2)})`);
    score += 20;
  } else if (input.currentPrice <= input.week52Low) {
    reasons.push(`Fell to a new 52-week low ($${input.currentPrice.toFixed(2)})`);
    score += 20;
  }

  // Cap score at 100
  const finalScore = Math.min(100, score);

  return {
    symbol: input.symbol,
    score: finalScore,
    isSignificant: finalScore >= 30,
    reasons: reasons.length > 0 ? reasons : ['No meaningful change detected'],
  };
}