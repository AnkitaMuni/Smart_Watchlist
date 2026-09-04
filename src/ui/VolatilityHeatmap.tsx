import { useMemo } from 'react';
import { useWatchlistEntries, useQuotes } from '../hooks';
import { Flame, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface VolatilityHeatmapProps {
  watchlistId: string | null;
  onSelectSymbol: (symbol: string) => void;
}

export function VolatilityHeatmap({ watchlistId, onSelectSymbol }: VolatilityHeatmapProps) {
  const { data: entries } = useWatchlistEntries(watchlistId);
  const symbols = useMemo(() => (entries ?? []).map((e) => e.symbol), [entries]);
  const { data: quotesMap, isLoading } = useQuotes(symbols);

  if (!watchlistId || symbols.length === 0) return null;

  if (isLoading && !quotesMap) {
    return (
      <div className="card p-6">
        <div className="animate-pulse-soft text-sm text-[#5a6478]">Loading market heatmap...</div>
      </div>
    );
  }

  const items = symbols.map((sym) => {
    const q = quotesMap?.get(sym)?.quote;
    const change = q?.changePercent ?? 0;
    const price = q?.price ?? 0;
    const volume = q?.volume ?? 0;

    let bgClass = 'bg-[#141b2d] border-[#1e2a44] text-[#e4e9f2]';
    let badgeClass = 'text-[#8b95a8] bg-[#1a2236]';

    if (change >= 3) {
      bgClass = 'bg-gradient-to-br from-emerald-950/80 to-emerald-900/40 border-emerald-500/40 text-emerald-100 hover:border-emerald-400';
      badgeClass = 'bg-emerald-500/20 text-emerald-300';
    } else if (change > 0) {
      bgClass = 'bg-gradient-to-br from-emerald-950/40 to-[#141b2d] border-emerald-500/20 text-emerald-200 hover:border-emerald-500/40';
      badgeClass = 'bg-emerald-500/10 text-emerald-400';
    } else if (change <= -3) {
      bgClass = 'bg-gradient-to-br from-rose-950/80 to-rose-900/40 border-rose-500/40 text-rose-100 hover:border-rose-400';
      badgeClass = 'bg-rose-500/20 text-rose-300';
    } else if (change < 0) {
      bgClass = 'bg-gradient-to-br from-rose-950/40 to-[#141b2d] border-rose-500/20 text-rose-200 hover:border-rose-500/40';
      badgeClass = 'bg-rose-500/10 text-rose-400';
    }

    return {
      symbol: sym,
      price,
      change,
      volume,
      bgClass,
      badgeClass,
    };
  });

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-500/10">
            <Flame size={16} className="text-accent-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[#e4e9f2]">Volatility & Performance Heatmap</h2>
            <p className="text-xs text-[#5a6478]">Visual intensity grid of relative price movements</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-[#5a6478]">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-400" /> Gainers
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-rose-400" /> Losers
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {items.map((item) => (
          <div
            key={item.symbol}
            onClick={() => onSelectSymbol(item.symbol)}
            className={`group flex cursor-pointer flex-col justify-between rounded-xl border p-3.5 transition-all hover:scale-[1.02] ${item.bgClass}`}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm font-bold">{item.symbol}</span>
              {item.change > 0 ? (
                <TrendingUp size={14} className="text-emerald-400" />
              ) : item.change < 0 ? (
                <TrendingDown size={14} className="text-rose-400" />
              ) : (
                <Minus size={14} className="text-[#5a6478]" />
              )}
            </div>

            <div className="mt-3 flex items-baseline justify-between">
              <span className="font-mono text-base font-bold">${item.price.toFixed(2)}</span>
              <span className={`font-mono text-xs font-semibold px-2 py-0.5 rounded ${item.badgeClass}`}>
                {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
