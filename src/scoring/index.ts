import type {
  SubScore,
  PricePoint,
  LastViewedRecord,
  MarketQuote,
  ScoringConfig,
  ChangeScore,
} from '../types';
import { DEFAULT_SCORING_CONFIG } from '../types';

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeZScore(z: number): number {
  // A |z| of 3+ is very significant; clamp to [0, 1]
  return clamp(Math.abs(z) / 3, 0, 1);
}

export function computeVolatility(history: PricePoint[]): number {
  if (history.length < 2) return 0;
  const returns: number[] = [];
  for (let i = 1; i < history.length; i++) {
    const prev = history[i - 1].price;
    const curr = history[i].price;
    if (prev > 0) returns.push((curr - prev) / prev);
  }
  return stdDev(returns);
}

export function computeAverageVolume(history: PricePoint[]): number {
  if (history.length === 0) return 0;
  return mean(history.map((p) => p.volume));
}

export function scorePriceMove(
  currentPrice: number,
  lastSeenPrice: number,
  history: PricePoint[],
): SubScore {
  if (lastSeenPrice <= 0) {
    return { type: 'price-move', score: 0, reason: 'No previous price to compare' };
  }
  const pctChange = ((currentPrice - lastSeenPrice) / lastSeenPrice) * 100;
  const volatility = computeVolatility(history);
  if (volatility === 0) {
    return {
      type: 'price-move',
      score: clamp(Math.abs(pctChange) / 10, 0, 1),
      reason: `${pctChange >= 0 ? 'up' : 'down'} ${Math.abs(pctChange).toFixed(1)}%`,
    };
  }
  // z-score: how many std devs is this move vs typical per-period volatility
  const z = pctChange / (volatility * 100);
  const score = normalizeZScore(z);
  return {
    type: 'price-move',
    score,
    reason: `${pctChange >= 0 ? 'Up' : 'Down'} ${Math.abs(pctChange).toFixed(1)}% (${Math.abs(z).toFixed(1)}σ vs typical)`,
  };
}

export function scoreVolumeAnomaly(
  currentVolume: number,
  history: PricePoint[],
  threshold: number,
): SubScore {
  const avgVol = computeAverageVolume(history);
  if (avgVol <= 0) {
    return { type: 'volume-spike', score: 0, reason: 'No volume history' };
  }
  const ratio = currentVolume / avgVol;
  if (ratio < threshold) {
    return { type: 'volume-spike', score: 0, reason: 'Normal volume' };
  }
  const score = clamp((ratio - threshold) / (threshold * 2), 0, 1);
  return {
    type: 'volume-spike',
    score,
    reason: `${ratio.toFixed(1)}x average volume`,
  };
}

export function scoreDirectionReversal(
  history: PricePoint[],
  lastSeenPrice: number,
  currentPrice: number,
): SubScore {
  if (history.length < 3 || lastSeenPrice <= 0) {
    return { type: 'direction-reversal', score: 0, reason: 'Insufficient history' };
  }
  // Determine trend before last seen: compare lastSeenPrice to price ~5 points before it
  const recentHistory = history.slice(-20);
  const beforePrice = recentHistory[0]?.price ?? lastSeenPrice;
  const wasTrendingUp = lastSeenPrice > beforePrice;
  const wasTrendingDown = lastSeenPrice < beforePrice;
  const currentMove = currentPrice - lastSeenPrice;
  const reversedUp = wasTrendingDown && currentMove > 0;
  const reversedDown = wasTrendingUp && currentMove < 0;
  if (!reversedUp && !reversedDown) {
    return { type: 'direction-reversal', score: 0, reason: 'No reversal' };
  }
  const movePct = Math.abs((currentMove / lastSeenPrice) * 100);
  const score = clamp(movePct / 5, 0, 1);
  return {
    type: 'direction-reversal',
    score,
    reason: `Reversed ${reversedUp ? 'upward' : 'downward'} after ${wasTrendingUp ? 'downtrend' : 'uptrend'}`,
  };
}

export function score52WeekHigh(
  currentPrice: number,
  week52High: number,
  lastSeenWeek52High: number,
): SubScore {
  if (currentPrice >= week52High && week52High > lastSeenWeek52High) {
    return {
      type: 'new-52-high',
      score: 1,
      reason: `New 52-week high at $${week52High.toFixed(2)}`,
    };
  }
  return { type: 'new-52-high', score: 0, reason: '' };
}

export function score52WeekLow(
  currentPrice: number,
  week52Low: number,
  lastSeenWeek52Low: number,
): SubScore {
  if (currentPrice <= week52Low && week52Low < lastSeenWeek52Low) {
    return {
      type: 'new-52-low',
      score: 1,
      reason: `New 52-week low at $${week52Low.toFixed(2)}`,
    };
  }
  return { type: 'new-52-low', score: 0, reason: '' };
}

export function scoreGapPattern(
  history: PricePoint[],
  lastSeenPrice: number,
  currentPrice: number,
): SubScore {
  if (history.length < 2 || lastSeenPrice <= 0) {
    return { type: 'gap-hold', score: 0, reason: '' };
  }
  const gapPct = Math.abs((currentPrice - lastSeenPrice) / lastSeenPrice) * 100;
  if (gapPct < 2) {
    return { type: 'gap-hold', score: 0, reason: '' };
  }
  // Check the most recent few points to see if the gap held or faded
  const recent = history.slice(-3);
  if (recent.length < 2) {
    return { type: 'gap-hold', score: 0, reason: '' };
  }
  const afterGapPrice = recent[recent.length - 1].price;
  const gapDirection = currentPrice > lastSeenPrice ? 'up' : 'down';
  const held = gapDirection === 'up'
    ? afterGapPrice >= currentPrice * 0.99
    : afterGapPrice <= currentPrice * 1.01;
  if (held) {
    return {
      type: 'gap-hold',
      score: clamp(gapPct / 10, 0, 1),
      reason: `Gapped ${gapDirection} ${gapPct.toFixed(1)}% and held`,
    };
  }
  return {
    type: 'gap-fade',
    score: clamp(gapPct / 15, 0, 1),
    reason: `Gapped ${gapDirection} ${gapPct.toFixed(1)}% but faded`,
  };
}

export function computeCompositeScore(
  quote: MarketQuote,
  lastViewed: LastViewedRecord | null,
  history: PricePoint[],
  config: ScoringConfig = DEFAULT_SCORING_CONFIG,
): ChangeScore {
  if (!lastViewed) {
    return {
      symbol: quote.symbol,
      compositeScore: 0,
      subScores: [],
      topReason: 'No previous view — start tracking to see changes',
      priceChangePercent: 0,
      currentPrice: quote.price,
      lastSeenPrice: quote.price,
      lastSeenAt: 0,
      currentVolume: quote.volume,
      averageVolume: computeAverageVolume(history),
    };
  }

  const priceMove = scorePriceMove(quote.price, lastViewed.lastPrice, history);
  const volumeSpike = scoreVolumeAnomaly(quote.volume, history, config.volumeSpikeThreshold);
  const reversal = scoreDirectionReversal(history, lastViewed.lastPrice, quote.price);
  const newHigh = score52WeekHigh(quote.price, quote.week52High, lastViewed.lastWeek52High);
  const newLow = score52WeekLow(quote.price, quote.week52Low, lastViewed.lastWeek52Low);
  const gap = scoreGapPattern(history, lastViewed.lastPrice, quote.price);
  const gapHold = gap.type === 'gap-hold' ? gap : { type: 'gap-hold' as const, score: 0, reason: '' };
  const gapFade = gap.type === 'gap-fade' ? gap : { type: 'gap-fade' as const, score: 0, reason: '' };

  const subScores: SubScore[] = [priceMove, volumeSpike, reversal, newHigh, newLow, gapHold, gapFade]
    .filter((s) => s.score > 0 || s.reason !== '');

  const compositeScore =
    priceMove.score * config.weights.priceMove +
    volumeSpike.score * config.weights.volumeSpike +
    reversal.score * config.weights.directionReversal +
    newHigh.score * config.weights.newHigh +
    newLow.score * config.weights.newLow +
    gapHold.score * config.weights.gapHold +
    gapFade.score * config.weights.gapFade;

  const topSub = subScores.length > 0
    ? [...subScores].sort((a, b) => b.score - a.score)[0]
    : null;

  const priceChangePercent = lastViewed.lastPrice > 0
    ? ((quote.price - lastViewed.lastPrice) / lastViewed.lastPrice) * 100
    : 0;

  return {
    symbol: quote.symbol,
    compositeScore: clamp(compositeScore, 0, 1),
    subScores,
    topReason: topSub?.reason ?? 'No significant change',
    priceChangePercent,
    currentPrice: quote.price,
    lastSeenPrice: lastViewed.lastPrice,
    lastSeenAt: lastViewed.lastViewedAt,
    currentVolume: quote.volume,
    averageVolume: computeAverageVolume(history),
  };
}

export function rankChanges(scores: ChangeScore[]): ChangeScore[] {
  return [...scores].sort((a, b) => b.compositeScore - a.compositeScore);
}
