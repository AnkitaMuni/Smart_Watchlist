import { createMarketDataProvider } from './provider';
import { QuoteCache } from './cache';

const provider = createMarketDataProvider();
export const quoteCache = new QuoteCache(provider);
