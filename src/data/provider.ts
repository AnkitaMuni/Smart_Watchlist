import type { MarketQuote, PriceHistory } from '../types';

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
    return {
      symbol: symbol.toUpperCase(),
      points: [],
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