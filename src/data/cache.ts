import type { MarketQuote, QuoteWithState, PriceHistory } from '../types';
import type { MarketDataProvider } from './provider';

interface CacheEntry {
  quote: MarketQuote;
  cachedAt: number;
  inflight?: Promise<MarketQuote | null>;
}

interface HistoryCacheEntry {
  history: PriceHistory;
  cachedAt: number;
}

const QUOTE_TTL = 30000; // 30 seconds
const HISTORY_TTL = 300000; // 5 minutes

export class QuoteCache {
  private quoteCache = new Map<string, CacheEntry>();
  private historyCache = new Map<string, HistoryCacheEntry>();
  private provider: MarketDataProvider;

  constructor(provider: MarketDataProvider) {
    this.provider = provider;
  }

  async getQuote(symbol: string): Promise<QuoteWithState> {
    const key = symbol.toUpperCase().trim();
    const now = Date.now();
    const cached = this.quoteCache.get(key);

    if (cached) {
      const age = now - cached.cachedAt;
      if (age < QUOTE_TTL) {
        return {
          quote: cached.quote,
          state: cached.quote.isMarketOpen ? 'live' : 'market-closed',
          stateMessage: this.freshnessMessage(cached.quote.timestamp),
        };
      }
      if (age < QUOTE_TTL * 4) {
        // Stale but usable
        return {
          quote: cached.quote,
          state: 'cached',
          stateMessage: `Cached — ${this.freshnessMessage(cached.quote.timestamp)}`,
        };
      }
    }

    try {
      const quote = await this.provider.getQuote(key);
      if (!quote) {
        if (cached) {
          return {
            quote: cached.quote,
            state: 'stale',
            stateMessage: `Stale data — API unavailable (${this.freshnessMessage(cached.quote.timestamp)})`,
          };
        }
        return {
          quote: null,
          state: 'unavailable',
          stateMessage: 'Data unavailable for this symbol',
        };
      }

      this.quoteCache.set(key, { quote, cachedAt: now });
      return {
        quote,
        state: quote.isMarketOpen ? 'live' : 'market-closed',
        stateMessage: quote.isMarketOpen
          ? this.freshnessMessage(quote.timestamp)
          : 'Market closed — showing last close data',
      };
    } catch {
      if (cached) {
        return {
          quote: cached.quote,
          state: 'stale',
          stateMessage: `Stale data — API error (${this.freshnessMessage(cached.quote.timestamp)})`,
        };
      }
      return {
        quote: null,
        state: 'unavailable',
        stateMessage: 'Data unavailable — API error',
      };
    }
  }

  async getQuotes(symbols: string[]): Promise<Map<string, QuoteWithState>> {
    const results = new Map<string, QuoteWithState>();
    await Promise.all(
      symbols.map(async (s) => {
        const result = await this.getQuote(s);
        results.set(s.toUpperCase().trim(), result);
      })
    );
    return results;
  }

  async getHistory(symbol: string, range: string): Promise<PriceHistory> {
    const key = `${symbol.toUpperCase()}_${range}`;
    const now = Date.now();
    const cached = this.historyCache.get(key);

    if (cached && now - cached.cachedAt < HISTORY_TTL) {
      return cached.history;
    }

    try {
      const history = await this.provider.getHistory(symbol, range);
      this.historyCache.set(key, { history, cachedAt: now });
      return history;
    } catch {
      if (cached) return cached.history;
      return { symbol: symbol.toUpperCase(), points: [] };
    }
  }

  async validateSymbol(symbol: string): Promise<boolean> {
    return this.provider.validateSymbol(symbol);
  }

  invalidateQuote(symbol: string): void {
    this.quoteCache.delete(symbol.toUpperCase().trim());
  }

  private freshnessMessage(timestamp: number): string {
    const ageMs = Date.now() - timestamp;
    if (ageMs < 60000) return 'as of just now';
    if (ageMs < 3600000) return `as of ${Math.floor(ageMs / 60000)} min ago`;
    return `as of ${Math.floor(ageMs / 3600000)} hr ago`;
  }
}
