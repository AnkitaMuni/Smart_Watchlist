import { useMemo, useState, useRef, useCallback } from 'react';
import { X, TrendingUp, TrendingDown, Minus, Wifi, WifiOff, AlertCircle, Clock, Zap, Flame, Award, AlignJustify, List } from 'lucide-react';
import { useWatchlistEntries, useQuotes, useRemoveSymbol } from '../hooks';
import type { QuoteWithState, DataState } from '../types';

interface WatchlistTableProps {
  watchlistId: string | null;
  onSelectSymbol: (symbol: string) => void;
}

export function WatchlistTable({ watchlistId, onSelectSymbol }: WatchlistTableProps) {
  const { data: entries } = useWatchlistEntries(watchlistId);
  const symbols = useMemo(() => (entries ?? []).map((e) => e.symbol), [entries]);
  const { data: quotesMap, isLoading } = useQuotes(symbols);
  const removeSymbol = useRemoveSymbol();
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);
  const [density, setDensity] = useState<'standard' | 'compact'>('standard');
  const containerRef = useRef<HTMLDivElement>(null);

  const rowHeight = density === 'compact' ? 40 : 56;
  const buffer = 5;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const handleResize = useCallback(() => {
    if (containerRef.current) {
      setContainerHeight(containerRef.current.clientHeight);
    }
  }, []);

  useMemo(() => {
    if (containerRef.current) {
      const observer = new ResizeObserver(handleResize);
      observer.observe(containerRef.current);
      return () => observer.disconnect();
    }
  }, [handleResize]);

  if (!watchlistId) {
    return (
      <div className="card flex items-center justify-center p-12 text-[#5a6478]">
        Select or create a watchlist to get started.
      </div>
    );
  }

  if (symbols.length === 0) {
    return (
      <div className="card p-12">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-500/10">
            <TrendingUp size={28} className="text-primary-400" />
          </div>
          <div>
            <h3 className="mb-1 text-base font-semibold text-[#e4e9f2]">Your watchlist is empty</h3>
            <p className="text-sm text-[#5a6478]">
              Add stock tickers above to start tracking. We'll surface what matters when things change.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading && !quotesMap) {
    return (
      <div className="card p-6">
        <div className="animate-pulse-soft text-sm text-[#5a6478]">Loading market data...</div>
      </div>
    );
  }

  const sortedSymbols = [...symbols].sort();
  const totalHeight = sortedSymbols.length * rowHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - buffer);
  const endIndex = Math.min(
    sortedSymbols.length,
    Math.ceil((scrollTop + containerHeight) / rowHeight) + buffer
  );
  const visibleSymbols = sortedSymbols.slice(startIndex, endIndex);

  return (
    <div className="space-y-2">
      {/* Density Switcher Controls */}
      <div className="flex items-center justify-between px-1 text-xs text-[#5a6478]">
        <span>Showing {sortedSymbols.length} tracked stocks</span>
        <div className="flex items-center gap-1 bg-[#111729] p-1 rounded-lg border border-[#1e2a44]">
          <button
            onClick={() => setDensity('standard')}
            className={`flex items-center gap-1 rounded px-2 py-0.5 transition-colors ${
              density === 'standard' ? 'bg-primary-500/20 text-primary-400 font-bold' : 'text-[#5a6478]'
            }`}
          >
            <List size={12} /> Standard
          </button>
          <button
            onClick={() => setDensity('compact')}
            className={`flex items-center gap-1 rounded px-2 py-0.5 transition-colors ${
              density === 'compact' ? 'bg-primary-500/20 text-primary-400 font-bold' : 'text-[#5a6478]'
            }`}
          >
            <AlignJustify size={12} /> Compact
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="card overflow-auto"
        style={{ maxHeight: '70vh' }}
      >
        {/* Header row */}
        <div
          className="sticky top-0 z-10 grid grid-cols-[80px_1fr_120px_100px_130px_40px] gap-2 border-b border-[#1e2a44] bg-[#111729] px-4 py-2 text-xs font-medium text-[#5a6478]"
          style={{ height: rowHeight - 8 }}
        >
          <div>Symbol</div>
          <div>Price</div>
          <div className="text-right">Change %</div>
          <div className="text-right">Volume</div>
          <div className="text-right">Status & Catalysts</div>
          <div></div>
        </div>

        {/* Virtualized rows */}
        <div style={{ height: totalHeight, position: 'relative' }}>
          <div style={{ transform: `translateY(${startIndex * rowHeight}px)` }}>
            {visibleSymbols.map((symbol) => {
              const data = quotesMap?.get(symbol);
              return (
                <WatchlistRow
                  key={symbol}
                  symbol={symbol}
                  data={data}
                  rowHeight={rowHeight}
                  onRemove={() => removeSymbol.mutate({ watchlistId, symbol })}
                  onSelect={() => onSelectSymbol(symbol)}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function WatchlistRow({
  symbol,
  data,
  rowHeight,
  onRemove,
  onSelect,
}: {
  symbol: string;
  data: QuoteWithState | undefined;
  rowHeight: number;
  onRemove: () => void;
  onSelect: () => void;
}) {
  const quote = data?.quote;
  const state: DataState = data?.state ?? 'unavailable';
  const isUp = quote ? quote.changePercent >= 0 : true;

  const isNearHigh = quote && quote.high >= (quote.week52High ?? quote.high) * 0.98;
  const isVolSurge = quote && quote.volume > 2000000;
  const isHighVol = quote && Math.abs(quote.changePercent) >= 3;

  return (
    <div
      onClick={onSelect}
      className="group grid cursor-pointer grid-cols-[80px_1fr_120px_100px_130px_40px] items-center gap-2 border-b border-[#1a2236] px-4 transition-colors hover:bg-[#1a2236]"
      style={{ height: rowHeight }}
    >
      <div className="font-mono text-sm font-semibold text-[#e4e9f2]">{symbol}</div>

      <div>
        {quote ? (
          <span className="font-mono text-sm text-[#e4e9f2]">
            ${quote.price.toFixed(2)}
          </span>
        ) : (
          <span className="text-sm text-[#5a6478]">—</span>
        )}
      </div>

      <div className="text-right flex items-center justify-end gap-1.5">
        {quote ? (
          <>
            <span className={`font-mono text-sm font-medium ${isUp ? 'price-up' : 'price-down'}`}>
              {isUp ? '+' : ''}{quote.changePercent.toFixed(2)}%
            </span>
          </>
        ) : (
          <span className="text-sm text-[#5a6478]">—</span>
        )}
      </div>

      <div className="text-right">
        {quote ? (
          <span className="font-mono text-xs text-[#8b95a8]">
            {formatVolume(quote.volume)}
          </span>
        ) : (
          <span className="text-sm text-[#5a6478]">—</span>
        )}
      </div>

      <div className="flex items-center justify-end gap-1">
        {isNearHigh && (
          <span className="badge bg-amber-500/10 text-amber-400 p-1" title="Near 52W High">
            <Award size={10} />
          </span>
        )}
        {isVolSurge && (
          <span className="badge bg-indigo-500/10 text-indigo-400 p-1" title="Volume Surge">
            <Zap size={10} />
          </span>
        )}
        {isHighVol && (
          <span className="badge bg-rose-500/10 text-rose-400 p-1" title="High Volatility">
            <Flame size={10} />
          </span>
        )}
        <StateBadge state={state} message={data?.stateMessage ?? ''} />
      </div>

      <div className="flex justify-end">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="rounded p-1 text-[#5a6478] opacity-0 transition-all hover:bg-error-500/10 hover:text-error-400 group-hover:opacity-100"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

function StateBadge({ state, message }: { state: DataState; message: string }) {
  switch (state) {
    case 'live':
      return (
        <span className="badge bg-success-500/10 text-success-400" title={message}>
          <Wifi size={10} className="mr-1" />
          Live
        </span>
      );
    case 'cached':
      return (
        <span className="badge bg-primary-500/10 text-primary-400" title={message}>
          <Clock size={10} className="mr-1" />
          Cached
        </span>
      );
    case 'stale':
      return (
        <span className="badge bg-warning-500/10 text-warning-400" title={message}>
          <WifiOff size={10} className="mr-1" />
          Stale
        </span>
      );
    case 'market-closed':
      return (
        <span className="badge bg-[#1a2236] text-[#8b95a8]" title={message}>
          <Clock size={10} className="mr-1" />
          Closed
        </span>
      );
    case 'unavailable':
      return (
        <span className="badge bg-error-500/10 text-error-400" title={message}>
          <AlertCircle size={10} className="mr-1" />
          N/A
        </span>
      );
    default:
      return (
        <span className="badge bg-[#1a2236] text-[#5a6478]">
          <Minus size={10} className="mr-1" />
          —
        </span>
      );
  }
}

function formatVolume(vol: number): string {
  if (vol >= 1e9) return `${(vol / 1e9).toFixed(1)}B`;
  if (vol >= 1e6) return `${(vol / 1e6).toFixed(1)}M`;
  if (vol >= 1e3) return `${(vol / 1e3).toFixed(1)}K`;
  return vol.toString();
}
