import Dexie, { type Table } from 'dexie';
import type { Watchlist, WatchlistEntry, LastViewedRecord, SymbolSnapshot } from '../types';

export class WatchlistDB extends Dexie {
  watchlists!: Table<Watchlist, string>;
  entries!: Table<WatchlistEntry, string>;
  lastViewed!: Table<LastViewedRecord, string>;
  snapshots!: Table<SymbolSnapshot, string>;

  constructor() {
    super('smart-watchlist-db');
    this.version(1).stores({
      watchlists: 'id, name, createdAt',
      entries: 'id, watchlistId, symbol, addedAt, [watchlistId+symbol]',
      lastViewed: 'symbol, lastViewedAt',
      snapshots: 'symbol, timestamp, [symbol+timestamp]',
    });
  }
}

export const db = new WatchlistDB();

export async function ensureDefaultWatchlist(): Promise<string> {
  const existing = await db.watchlists.toArray();
  if (existing.length > 0) return existing[0].id;

  const id = crypto.randomUUID();
  await db.watchlists.add({
    id,
    name: 'My Watchlist',
    createdAt: Date.now(),
  });
  return id;
}

export async function getAllWatchlists(): Promise<Watchlist[]> {
  return db.watchlists.orderBy('createdAt').toArray();
}

export async function createWatchlist(name: string): Promise<string> {
  const id = crypto.randomUUID();
  await db.watchlists.add({ id, name, createdAt: Date.now() });
  return id;
}

export async function renameWatchlist(id: string, name: string): Promise<void> {
  await db.watchlists.update(id, { name });
}

export async function deleteWatchlist(id: string): Promise<void> {
  await db.transaction('rw', db.watchlists, db.entries, async () => {
    await db.entries.where('watchlistId').equals(id).delete();
    await db.watchlists.delete(id);
  });
}

export async function getWatchlistEntries(watchlistId: string): Promise<WatchlistEntry[]> {
  return db.entries.where('watchlistId').equals(watchlistId).toArray();
}

export async function addSymbolToWatchlist(watchlistId: string, symbol: string): Promise<void> {
  const upper = symbol.toUpperCase().trim();
  const existing = await db.entries
    .where('[watchlistId+symbol]')
    .equals([watchlistId, upper])
    .first();
  if (existing) return;

  await db.entries.add({
    id: crypto.randomUUID(),
    watchlistId,
    symbol: upper,
    addedAt: Date.now(),
  });
}

export async function removeSymbolFromWatchlist(watchlistId: string, symbol: string): Promise<void> {
  const upper = symbol.toUpperCase().trim();
  await db.entries
    .where('[watchlistId+symbol]')
    .equals([watchlistId, upper])
    .delete();
}

export async function getLastViewed(symbol: string): Promise<LastViewedRecord | null> {
  return (await db.lastViewed.get(symbol.toUpperCase().trim())) ?? null;
}

export async function getAllLastViewed(symbols: string[]): Promise<Map<string, LastViewedRecord>> {
  const result = new Map<string, LastViewedRecord>();
  const records = await db.lastViewed
    .where('symbol')
    .anyOf(symbols.map((s) => s.toUpperCase().trim()))
    .toArray();
  for (const r of records) {
    result.set(r.symbol, r);
  }
  return result;
}

export async function updateLastViewed(
  symbol: string,
  price: number,
  volume: number,
  changePercent: number,
  week52High: number,
  week52Low: number,
): Promise<void> {
  const upper = symbol.toUpperCase().trim();
  await db.lastViewed.put({
    symbol: upper,
    lastViewedAt: Date.now(),
    lastPrice: price,
    lastVolume: volume,
    lastChangePercent: changePercent,
    lastWeek52High: week52High,
    lastWeek52Low: week52Low,
  });
}

export async function saveSnapshot(snapshot: SymbolSnapshot): Promise<void> {
  await db.snapshots.add(snapshot);
}

export async function getRecentSnapshots(symbol: string, limit: number = 30): Promise<SymbolSnapshot[]> {
  const upper = symbol.toUpperCase().trim();
  return db.snapshots
    .where('symbol')
    .equals(upper)
    .reverse()
    .limit(limit)
    .toArray()
    .then((arr) => arr.reverse());
}
