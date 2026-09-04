import type { MarketQuote, PriceHistory, PricePoint } from '../types';

export interface MarketDataProvider {
  getQuote(symbol: string): Promise<MarketQuote | null>;
  getQuotes(symbols: string[]): Promise<MarketQuote[]>;
  getHistory(symbol: string, range: string): Promise<PriceHistory>;
  validateSymbol(symbol: string): Promise<boolean>;
}

// Deterministic PRNG so mock data is consistent across reloads per symbol
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function hashSymbol(symbol: string): number {
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) {
    hash = (hash * 31 + symbol.charCodeAt(i)) >>> 0;
  }
  return hash;
}

const KNOWN_SYMBOLS = new Set([
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'NFLX',
  'JPM', 'V', 'JNJ', 'WMT', 'PG', 'MA', 'UNH', 'HD', 'DIS', 'BAC',
  'XOM', 'CVX', 'PFE', 'KO', 'PEP', 'INTC', 'CSCO', 'ORCL', 'ADBE',
  'CRM', 'AMD', 'AVGO', 'COST', 'MRK', 'ABBV', 'TMO', 'MCD', 'NKE',
  'RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK', 'SBIN', 'WIPRO',
  'BHARTIARTL', 'ITC', 'LT', 'AXISBANK', 'MARUTI', 'SUNPHARMA',
]);

const BASE_PRICES: Record<string, number> = {
  AAPL: 195, MSFT: 420, GOOGL: 175, AMZN: 185, NVDA: 880, META: 500,
  TSLA: 250, NFLX: 610, JPM: 200, V: 275, JNJ: 150, WMT: 75,
  PG: 165, MA: 460, UNH: 520, HD: 350, DIS: 95, BAC: 38,
  XOM: 115, CVX: 155, PFE: 28, KO: 62, PEP: 175, INTC: 35,
  CSCO: 50, ORCL: 130, ADBE: 550, CRM: 270, AMD: 170, AVGO: 1300,
  COST: 720, MRK: 125, ABBV: 175, TMO: 580, MCD: 290, NKE: 95,
  RELIANCE: 2950, TCS: 3850, INFY: 1650, HDFCBANK: 1680, ICICIBANK: 1150,
  SBIN: 780, WIPRO: 460, BHARTIARTL: 1280, ITC: 420, LT: 3550,
  AXISBANK: 1050, MARUTI: 12500, SUNPHARMA: 1650,
};

function getBasePrice(symbol: string): number {
  if (BASE_PRICES[symbol]) return BASE_PRICES[symbol];
  const rng = seededRandom(hashSymbol(symbol));
  return 50 + rng() * 450;
}

function getVolatility(symbol: string): number {
  const rng = seededRandom(hashSymbol(symbol) + 1);
  return 0.005 + rng() * 0.03;
}

function getDrift(symbol: string): number {
  const rng = seededRandom(hashSymbol(symbol) + 2);
  return (rng() - 0.5) * 0.0005;
}

function isMarketOpen(): boolean {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  const minutes = now.getMinutes();
  const time = hour * 60 + minutes;
  // Mon-Fri, 9:30-16:00 (using local time as a rough approximation)
  return day >= 1 && day <= 5 && time >= 570 && time < 960;
}

export class MockMarketDataProvider implements MarketDataProvider {
  async getQuote(symbol: string): Promise<MarketQuote | null> {
    return this.generateQuote(symbol);
  }

  async getQuotes(symbols: string[]): Promise<MarketQuote[]> {
    const quotes: MarketQuote[] = [];
    for (const symbol of symbols) {
      const q = this.generateQuote(symbol);
      if (q) quotes.push(q);
    }
    return quotes;
  }

  async getHistory(symbol: string, range: string): Promise<PriceHistory> {
    const points = this.generateHistory(symbol, range);
    return { symbol, points };
  }

  async validateSymbol(symbol: string): Promise<boolean> {
    const upper = symbol.toUpperCase().trim();
    return KNOWN_SYMBOLS.has(upper) || upper.length >= 1;
  }

  private generateQuote(symbol: string): MarketQuote | null {
    const upper = symbol.toUpperCase().trim();
    if (!upper) return null;

    const basePrice = getBasePrice(upper);
    const vol = getVolatility(upper);
    const drift = getDrift(upper);
    const rng = seededRandom(hashSymbol(upper) + Date.now() % 10000);

    // Random walk from base price
    let price = basePrice;
    const walkSteps = 100;
    for (let i = 0; i < walkSteps; i++) {
      const shock = (rng() - 0.5) * 2 * vol * basePrice;
      price += shock + drift * basePrice;
    }

    // Occasional volatility spike (5% chance)
    if (rng() < 0.05) {
      price *= 1 + (rng() - 0.5) * 0.08;
    }

    price = Math.max(price, basePrice * 0.3);

    const prevClose = basePrice * (1 + (rng() - 0.5) * 0.05);
    const change = price - prevClose;
    const changePercent = (change / prevClose) * 100;

    const avgVolume = 1000000 + hashSymbol(upper) % 5000000;
    const volume = Math.floor(avgVolume * (0.5 + rng() * 2.5));

    const week52High = basePrice * (1.2 + rng() * 0.3);
    const week52Low = basePrice * (0.6 + rng() * 0.2);

    return {
      symbol: upper,
      price: Math.round(price * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      change: Math.round(change * 100) / 100,
      volume,
      high: Math.round(price * 1.02 * 100) / 100,
      low: Math.round(price * 0.98 * 100) / 100,
      open: Math.round(prevClose * 100) / 100,
      prevClose: Math.round(prevClose * 100) / 100,
      week52High: Math.round(week52High * 100) / 100,
      week52Low: Math.round(week52Low * 100) / 100,
      timestamp: Date.now(),
      isMarketOpen: isMarketOpen(),
    };
  }

  private generateHistory(symbol: string, range: string): PricePoint[] {
    const upper = symbol.toUpperCase().trim();
    const basePrice = getBasePrice(upper);
    const vol = getVolatility(upper);
    const drift = getDrift(upper);
    const rng = seededRandom(hashSymbol(upper));

    const now = Date.now();
    let numPoints: number;
    let intervalMs: number;

    switch (range) {
      case '1D': numPoints = 78; intervalMs = 300000; break;
      case '1W': numPoints = 56; intervalMs = 3600000; break;
      case '1M': numPoints = 30; intervalMs = 86400000; break;
      case '3M': numPoints = 90; intervalMs = 86400000; break;
      case '1Y': numPoints = 252; intervalMs = 86400000; break;
      default: numPoints = 30; intervalMs = 86400000;
    }

    const points: PricePoint[] = [];
    let price = basePrice * 0.9;
    let currentHigh = price;
    let currentLow = price;

    for (let i = 0; i < numPoints; i++) {
      const shock = (rng() - 0.5) * 2 * vol * price;
      price += shock + drift * price;
      price = Math.max(price, basePrice * 0.3);

      if (price > currentHigh) currentHigh = price;
      if (price < currentLow) currentLow = price;

      const avgVol = 1000000 + hashSymbol(upper) % 5000000;
      const volume = Math.floor(avgVol * (0.5 + rng() * 2));

      points.push({
        timestamp: now - (numPoints - i) * intervalMs,
        price: Math.round(price * 100) / 100,
        volume,
      });
    }

    return points;
  }
}

// Finnhub provider stub — implements the same interface, activated when an API key is present.
// To use: set VITE_MARKET_DATA_API_KEY in .env and swap the provider in data/provider-factory.ts
export class FinnhubProvider implements MarketDataProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getQuote(symbol: string): Promise<MarketQuote | null> {
    try {
      const resp = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${this.apiKey}`
      );
      if (!resp.ok) return null;
      const data = await resp.json();
      if (!data || data.c === 0) return null;

      return {
        symbol: symbol.toUpperCase(),
        price: data.c,
        change: data.d,
        changePercent: data.dp,
        volume: 0,
        high: data.h,
        low: data.l,
        open: data.o,
        prevClose: data.pc,
        week52High: 0,
        week52Low: 0,
        timestamp: Date.now(),
        isMarketOpen: isMarketOpen(),
      };
    } catch {
      return null;
    }
  }

  async getQuotes(symbols: string[]): Promise<MarketQuote[]> {
    const quotes = await Promise.all(symbols.map((s: string) => this.getQuote(s)));
    return quotes.filter((q: MarketQuote | null): q is MarketQuote => q !== null);
  }

  async getHistory(symbol: string, _range: string): Promise<PriceHistory> {
    // Finnhub free tier doesn't include historical candles; fall back to mock-style empty
    return { symbol: symbol.toUpperCase(), points: [] };
  }

  async validateSymbol(symbol: string): Promise<boolean> {
    const quote = await this.getQuote(symbol);
    return quote !== null;
  }
}

export function createMarketDataProvider(): MarketDataProvider {
  const apiKey = import.meta.env.VITE_MARKET_DATA_API_KEY;
  if (apiKey && apiKey.length > 0) {
    return new FinnhubProvider(apiKey);
  }
  return new MockMarketDataProvider();
}
