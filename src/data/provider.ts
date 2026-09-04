import type { MarketQuote, PriceHistory, PricePoint } from '../types';

export interface MarketDataProvider {
  getQuote(symbol: string): Promise<MarketQuote | null>;
  getQuotes(symbols: string[]): Promise<MarketQuote[]>;
  getHistory(symbol: string, range: string): Promise<PriceHistory>;
  validateSymbol(symbol: string): Promise<boolean>;
}

export class BackendMarketDataProvider implements MarketDataProvider {
  async getQuote(symbol: string): Promise<MarketQuote | null> {
    const quotes = await this.getQuotes([symbol]);
    return quotes[0] || null;
  }

  async getQuotes(symbols: string[]): Promise<MarketQuote[]> {
    if (!symbols.length) return [];

    try {
      const query = encodeURIComponent(symbols.join(','));
      const response = await fetch(`/api/quotes?symbols=${query}`);

      if (!response.ok) {
        throw new Error(`Proxy error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.quotes || [];
    } catch (error) {
      console.error('Failed to fetch from backend quote proxy:', error);
      return [];
    }
  }

  async getHistory(symbol: string, range: string): Promise<PriceHistory> {
    const quote = await this.getQuote(symbol);
    const basePrice = quote?.price || 150;
    const now = Math.floor(Date.now() / 1000);
    const points: PricePoint[] = [];

    for (let i = 30; i >= 0; i--) {
      const time = now - i * 86400;
      const variation = (Math.random() - 0.48) * (basePrice * 0.02);
      const price = Number((basePrice + variation).toFixed(2));
      points.push({
        timestamp: time,
        price: price,
      } as PricePoint);
    }

    return {
      symbol: symbol.toUpperCase(),
      points,
    };
  }

  async validateSymbol(symbol: string): Promise<boolean> {
    const quotes = await this.getQuotes([symbol]);
    return quotes.length > 0 && quotes[0].price > 0;
  }
}

export function createMarketDataProvider(): MarketDataProvider {
  return new BackendMarketDataProvider();
}