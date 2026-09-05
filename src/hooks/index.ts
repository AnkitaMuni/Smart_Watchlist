import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAllWatchlists,
  createWatchlist,
  renameWatchlist,
  deleteWatchlist,
  getWatchlistEntries,
  addSymbolToWatchlist,
  removeSymbolFromWatchlist,
  ensureDefaultWatchlist,
  getLastViewed,
  getAllLastViewed,
  updateLastViewed,
  saveSnapshot,
  getRecentSnapshots,
} from '../db';
import { quoteCache } from '../data/cache-context';
import type { ChangeScore, MarketQuote, PricePoint } from '../types';
import { computeCompositeScore, rankChanges } from '../scoring';

export function useWatchlists() {
  return useQuery({
    queryKey: ['watchlists'],
    queryFn: async () => {
      await ensureDefaultWatchlist();
      return getAllWatchlists();
    },
  });
}

export function useCreateWatchlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createWatchlist(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['watchlists'] }),
  });
}

export function useRenameWatchlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => renameWatchlist(id, name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['watchlists'] }),
  });
}

export function useDeleteWatchlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteWatchlist(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['watchlists'] });
      qc.invalidateQueries({ queryKey: ['entries'] });
    },
  });
}

export function useWatchlistEntries(watchlistId: string | null) {
  return useQuery({
    queryKey: ['entries', watchlistId],
    queryFn: () => (watchlistId ? getWatchlistEntries(watchlistId) : Promise.resolve([])),
    enabled: !!watchlistId,
  });
}

export function useAddSymbol() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ watchlistId, symbol }: { watchlistId: string; symbol: string }) => {
      const valid = await quoteCache.validateSymbol(symbol);
      if (!valid) throw new Error(`Unknown ticker: ${symbol}`);
      await addSymbolToWatchlist(watchlistId, symbol);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['entries'] }),
  });
}

export function useRemoveSymbol() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ watchlistId, symbol }: { watchlistId: string; symbol: string }) =>
      removeSymbolFromWatchlist(watchlistId, symbol),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['entries'] }),
  });
}

export function useQuotes(symbols: string[]) {
  return useQuery({
    queryKey: ['quotes', symbols],
    queryFn: async () => {
      const result = await quoteCache.getQuotes(symbols);
      for (const [sym, item] of result.entries()) {
        if (item.quote) {
          saveSnapshot({
            symbol: sym,
            price: item.quote.price,
            volume: item.quote.volume,
            changePercent: item.quote.changePercent,
            week52High: item.quote.week52High,
            week52Low: item.quote.week52Low,
            timestamp: Date.now(),
          }).catch(() => {});
        }
      }
      return result;
    },
    enabled: symbols.length > 0,
    refetchInterval: 30000,
  });
}

export function useHistory(symbol: string | null, range: string = '1M') {
  return useQuery({
    queryKey: ['history', symbol, range],
    queryFn: async () => (symbol ? quoteCache.getHistory(symbol, range) : { symbol: '', points: [] as PricePoint[] }),
    enabled: !!symbol,
  });
}

export function useWhatChanged(symbols: string[]) {
  return useQuery({
    queryKey: ['what-changed', symbols],
    queryFn: async (): Promise<ChangeScore[]> => {
      if (symbols.length === 0) return [];

      const quotesMap = await quoteCache.getQuotes(symbols);
      const lastViewedMap = await getAllLastViewed(symbols);

      const scores: ChangeScore[] = [];
      for (const sym of symbols) {
        const { quote } = quotesMap.get(sym) ?? { quote: null };
        if (!quote) continue;

        const lastViewed = lastViewedMap.get(sym) ?? null;
        const snapshots = await getRecentSnapshots(sym, 30);
        const history: PricePoint[] = snapshots.map((s) => ({
          timestamp: s.timestamp,
          price: s.price,
          volume: s.volume,
        }));

        scores.push(computeCompositeScore(quote, lastViewed, history));
      }

      return rankChanges(scores);
    },
    enabled: symbols.length > 0,
    refetchInterval: 30000,
  });
}

export function useMarkAsSeen() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (quotes: MarketQuote[]) => {
      for (const q of quotes) {
        await updateLastViewed(
          q.symbol,
          q.price,
          q.volume,
          q.changePercent,
          q.week52High,
          q.week52Low,
        );
        await saveSnapshot({
          symbol: q.symbol,
          price: q.price,
          volume: q.volume,
          changePercent: q.changePercent,
          week52High: q.week52High,
          week52Low: q.week52Low,
          timestamp: Date.now(),
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['what-changed'] });
      qc.invalidateQueries({ queryKey: ['last-viewed'] });
    },
  });
}

export function useLastViewed(symbol: string | null) {
  return useQuery({
    queryKey: ['last-viewed', symbol],
    queryFn: () => (symbol ? getLastViewed(symbol) : Promise.resolve(null)),
    enabled: !!symbol,
  });
}
