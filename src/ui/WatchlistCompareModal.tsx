import { useState } from 'react';
import { X, Columns, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { useWatchlists, useWatchlistEntries, useQuotes } from '../hooks';

interface WatchlistCompareModalProps {
  currentWatchlistId: string | null;
  onClose: () => void;
}

export function WatchlistCompareModal({ currentWatchlistId, onClose }: WatchlistCompareModalProps) {
  const { data: watchlists } = useWatchlists();

  const [listAId, setListAId] = useState<string>(currentWatchlistId || watchlists?.[0]?.id || '');
  const [listBId, setListBId] = useState<string>(
    watchlists?.find((w) => w.id !== currentWatchlistId)?.id || watchlists?.[0]?.id || ''
  );

  const { data: entriesA } = useWatchlistEntries(listAId);
  const { data: entriesB } = useWatchlistEntries(listBId);

  const symbolsA = (entriesA ?? []).map((e) => e.symbol);
  const symbolsB = (entriesB ?? []).map((e) => e.symbol);

  const allSymbols = Array.from(new Set([...symbolsA, ...symbolsB]));
  const { data: quotesMap } = useQuotes(allSymbols);

  const listAObj = watchlists?.find((w) => w.id === listAId);
  const listBObj = watchlists?.find((w) => w.id === listBId);

  const calcStats = (symbols: string[]) => {
    const quotes = symbols
      .map((s) => quotesMap?.get(s)?.quote)
      .filter((q): q is NonNullable<typeof q> => q !== null && q !== undefined);

    if (quotes.length === 0) return { avgChange: 0, gainers: 0, losers: 0, top: null };

    const totalChange = quotes.reduce((acc, q) => acc + q.changePercent, 0);
    const avgChange = totalChange / quotes.length;
    const gainers = quotes.filter((q) => q.changePercent > 0).length;
    const losers = quotes.filter((q) => q.changePercent < 0).length;
    const top = [...quotes].sort((a, b) => b.changePercent - a.changePercent)[0] || null;

    return { avgChange, gainers, losers, top };
  };

  const statsA = calcStats(symbolsA);
  const statsB = calcStats(symbolsB);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="card my-8 w-full max-w-4xl p-6 sm:p-8 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-6 flex items-start justify-between border-b border-[#1e2a44] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-500/10 text-accent-400">
              <Columns size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#e4e9f2]">Multi-Watchlist Side-by-Side Comparison</h2>
              <p className="text-xs text-[#8b95a8]">Compare performance, momentum, and volume deltas across watchlists</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost p-2 text-[#8b95a8] hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Watchlist Selectors */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-[#1e2a44] bg-[#111729] p-4">
            <label className="text-xs font-bold uppercase tracking-wider text-primary-400 block mb-2">
              Watchlist A
            </label>
            <select
              value={listAId}
              onChange={(e) => setListAId(e.target.value)}
              className="input text-xs w-full font-semibold"
            >
              {watchlists?.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
            <div className="mt-4 space-y-1.5 text-xs text-[#8b95a8]">
              <div className="flex justify-between">
                <span>Avg Performance:</span>
                <span className={`font-mono font-bold ${statsA.avgChange >= 0 ? 'price-up' : 'price-down'}`}>
                  {statsA.avgChange >= 0 ? '+' : ''}{statsA.avgChange.toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>Advancers / Decliners:</span>
                <span className="font-mono text-[#e4e9f2]">{statsA.gainers} / {statsA.losers}</span>
              </div>
              {statsA.top && (
                <div className="flex justify-between">
                  <span>Top Mover:</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {statsA.top.symbol} (+{statsA.top.changePercent.toFixed(1)}%)
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-[#1e2a44] bg-[#111729] p-4">
            <label className="text-xs font-bold uppercase tracking-wider text-accent-400 block mb-2">
              Watchlist B
            </label>
            <select
              value={listBId}
              onChange={(e) => setListBId(e.target.value)}
              className="input text-xs w-full font-semibold"
            >
              {watchlists?.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
            <div className="mt-4 space-y-1.5 text-xs text-[#8b95a8]">
              <div className="flex justify-between">
                <span>Avg Performance:</span>
                <span className={`font-mono font-bold ${statsB.avgChange >= 0 ? 'price-up' : 'price-down'}`}>
                  {statsB.avgChange >= 0 ? '+' : ''}{statsB.avgChange.toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>Advancers / Decliners:</span>
                <span className="font-mono text-[#e4e9f2]">{statsB.gainers} / {statsB.losers}</span>
              </div>
              {statsB.top && (
                <div className="flex justify-between">
                  <span>Top Mover:</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {statsB.top.symbol} (+{statsB.top.changePercent.toFixed(1)}%)
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Side-by-Side Symbol Breakdown */}
        <div className="rounded-xl border border-[#1e2a44] bg-[#0a0e1a] p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#e4e9f2] mb-3">
            Comparative Stocks Matrix
          </h3>
          <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-[#5a6478] border-b border-[#1e2a44] pb-2 mb-2">
            <div>{listAObj?.name || 'Watchlist A'}</div>
            <div>{listBObj?.name || 'Watchlist B'}</div>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                {symbolsA.map((sym) => {
                  const q = quotesMap?.get(sym)?.quote;
                  return (
                    <div key={sym} className="flex justify-between rounded bg-[#111729] p-2 border border-[#1e2a44]">
                      <span className="font-mono font-bold text-[#e4e9f2]">{sym}</span>
                      <span className={`font-mono ${q && q.changePercent >= 0 ? 'price-up' : 'price-down'}`}>
                        {q ? `${q.changePercent >= 0 ? '+' : ''}${q.changePercent.toFixed(2)}%` : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-1.5">
                {symbolsB.map((sym) => {
                  const q = quotesMap?.get(sym)?.quote;
                  return (
                    <div key={sym} className="flex justify-between rounded bg-[#111729] p-2 border border-[#1e2a44]">
                      <span className="font-mono font-bold text-[#e4e9f2]">{sym}</span>
                      <span className={`font-mono ${q && q.changePercent >= 0 ? 'price-up' : 'price-down'}`}>
                        {q ? `${q.changePercent >= 0 ? '+' : ''}${q.changePercent.toFixed(2)}%` : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
