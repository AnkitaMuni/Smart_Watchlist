import Dexie, { type Table } from 'dexie';
import { createClient } from '@supabase/supabase-js';
import type { Watchlist, WatchlistEntry, LastViewedRecord, SymbolSnapshot } from '../types';

function cleanSupabaseUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  let cleaned = url.trim().replace(/\/+$/, '');
  cleaned = cleaned.replace(/\/rest\/v1\/?$/, '');
  return cleaned;
}

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseUrl = cleanSupabaseUrl(rawSupabaseUrl);
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

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

  if (supabase) {
    try {
      const { data } = await supabase.from('watchlists').select('*').limit(1);
      if (data && data.length > 0) {
        const sbList = data[0];
        const id = sbList.id;
        await db.watchlists.put({ id, name: sbList.name || 'My Watchlist', createdAt: Date.now() });
        return id;
      }
    } catch (err) {
      console.warn('Supabase fetch error:', err);
    }
  }

  if (existing.length > 0) return existing[0].id;

  const id = crypto.randomUUID();
  const name = 'My Watchlist';
  const createdAt = Date.now();
  await db.watchlists.add({ id, name, createdAt });

  if (supabase) {
    try {
      await supabase.from('watchlists').insert({ id, name });
    } catch (err) {
      console.warn('Supabase insert error:', err);
    }
  }

  return id;
}

export async function getAllWatchlists(): Promise<Watchlist[]> {
  if (supabase) {
    try {
      const { data } = await supabase.from('watchlists').select('*');
      if (data && data.length > 0) {
        const items: Watchlist[] = data.map((d: any) => ({
          id: d.id,
          name: d.name,
          createdAt: d.created_at ? new Date(d.created_at).getTime() : Date.now(),
        }));
        for (const item of items) {
          await db.watchlists.put(item);
        }
        return items;
      }
    } catch (err) {
      console.warn('Supabase getAllWatchlists error:', err);
    }
  }
  return db.watchlists.orderBy('createdAt').toArray();
}

export async function createWatchlist(name: string): Promise<string> {
  const id = crypto.randomUUID();
  const createdAt = Date.now();
  await db.watchlists.add({ id, name, createdAt });

  if (supabase) {
    try {
      await supabase.from('watchlists').insert({ id, name });
    } catch (err) {
      console.warn('Supabase createWatchlist error:', err);
    }
  }
  return id;
}

export async function renameWatchlist(id: string, name: string): Promise<void> {
  await db.watchlists.update(id, { name });
  if (supabase) {
    try {
      await supabase.from('watchlists').update({ name }).eq('id', id);
    } catch (err) {
      console.warn('Supabase renameWatchlist error:', err);
    }
  }
}

export async function deleteWatchlist(id: string): Promise<void> {
  await db.transaction('rw', db.watchlists, db.entries, async () => {
    await db.entries.where('watchlistId').equals(id).delete();
    await db.watchlists.delete(id);
  });

  if (supabase) {
    try {
      await supabase.from('watchlist_symbols').delete().eq('watchlist_id', id);
      await supabase.from('watchlists').delete().eq('id', id);
    } catch (err) {
      console.warn('Supabase deleteWatchlist error:', err);
    }
  }
}

export async function getWatchlistEntries(watchlistId: string): Promise<WatchlistEntry[]> {
  if (supabase) {
    try {
      const { data } = await supabase
        .from('watchlist_symbols')
        .select('*')
        .eq('watchlist_id', watchlistId);

      if (data && data.length > 0) {
        const entries: WatchlistEntry[] = data.map((d: any) => ({
          id: d.id || crypto.randomUUID(),
          watchlistId: d.watchlist_id || watchlistId,
          symbol: d.symbol.toUpperCase(),
          addedAt: d.added_at ? new Date(d.added_at).getTime() : Date.now(),
        }));
        for (const e of entries) {
          await db.entries.put(e);
        }
        return entries;
      }
    } catch (err) {
      console.warn('Supabase getWatchlistEntries error:', err);
    }
  }
  return db.entries.where('watchlistId').equals(watchlistId).toArray();
}

export async function addSymbolToWatchlist(watchlistId: string, symbol: string): Promise<void> {
  const upper = symbol.toUpperCase().trim();
  const existing = await db.entries
    .where('[watchlistId+symbol]')
    .equals([watchlistId, upper])
    .first();

  if (!existing) {
    const entry: WatchlistEntry = {
      id: crypto.randomUUID(),
      watchlistId,
      symbol: upper,
      addedAt: Date.now(),
    };
    await db.entries.add(entry);

    if (supabase) {
      try {
        await supabase.from('watchlist_symbols').insert({
          id: entry.id,
          watchlist_id: watchlistId,
          symbol: upper,
        });
      } catch (err) {
        console.warn('Supabase addSymbolToWatchlist error:', err);
      }
    }
  }
}

export async function removeSymbolFromWatchlist(watchlistId: string, symbol: string): Promise<void> {
  const upper = symbol.toUpperCase().trim();
  await db.entries
    .where('[watchlistId+symbol]')
    .equals([watchlistId, upper])
    .delete();

  if (supabase) {
    try {
      await supabase
        .from('watchlist_symbols')
        .delete()
        .eq('watchlist_id', watchlistId)
        .eq('symbol', upper);
    } catch (err) {
      console.warn('Supabase removeSymbolFromWatchlist error:', err);
    }
  }
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
  const record: LastViewedRecord = {
    symbol: upper,
    lastViewedAt: Date.now(),
    lastPrice: price,
    lastVolume: volume,
    lastChangePercent: changePercent,
    lastWeek52High: week52High,
    lastWeek52Low: week52Low,
  };
  await db.lastViewed.put(record);

  if (supabase) {
    try {
      await supabase.from('sessions').upsert({
        symbol: upper,
        last_price: price,
        last_volume: volume,
        last_change_percent: changePercent,
        last_viewed_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('Supabase updateLastViewed error:', err);
    }
  }
}

export async function saveSnapshot(snapshot: SymbolSnapshot): Promise<void> {
  await db.snapshots.add(snapshot);

  if (supabase) {
    try {
      await supabase.from('symbol_snapshots').insert({
        symbol: snapshot.symbol,
        price: snapshot.price,
        volume: snapshot.volume,
        change_percent: snapshot.changePercent,
        week52_high: snapshot.week52High,
        week52_low: snapshot.week52Low,
      });
    } catch (err) {
      console.warn('Supabase saveSnapshot error:', err);
    }
  }
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
