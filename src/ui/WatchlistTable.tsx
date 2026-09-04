import { useMemo, useState, useRef, useCallback } from 'react';
import { X, TrendingUp, TrendingDown, Minus, Wifi, WifiOff, AlertCircle, Clock } from 'lucide-react';
import { useWatchlistEntries, useQuotes, useRemoveSymbol } from '../hooks';
import type { QuoteWithState, DataState } from '../types';

interface WatchlistTableProps {
  watchlistId: string | null;
  onSelectSymbol: (symbol: string) => void;
}

const ROW_HEIGHT = 56;
const BUFFER = 5;

export function WatchlistTable({ watchlistId, onSelectSymbol }: WatchlistTableProps) {
  const { data: entries } = useWatchlistEntries(watchlistId);
  const symbols = useMemo(() => (entries ?? []).map((e) => e.symbol), [entries]);
  const { data: quotesMap, isLoading } = useQuotes(symbols);
  const removeSymbol = useRemoveSymbol();
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const handleResize = useCallback(() => {
    if (containerRef.current) {
      setContainerHeight(containerRef.current.clientHeight);
    }
  }, []);

  // Observe container resize
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
  const totalHeight = sortedSymbols.length * ROW_HEIGHT;
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER);
  const endIndex = Math.min(
    sortedSymbols.length,
    Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT) + BUFFER,
  );
  const visibleSymbols = sortedSymbols.slice(startIndex, endIndex);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="card overflow-auto"
      style={{ maxHeight: '70vh' }}
    >
      {/* Header row */}
      <div
        className="sticky top-0 z-10 grid grid-cols-[80px_1fr_100px_100px_120px_40px] gap-2 border-b border-[#1e2a44] bg-[#111729] px-4 py-2.5 text-xs font-medium text-[#5a6478]"
      style={{ height: ROW_HEIGHT - 8 }}
      >
        <div>Symbol</div>
        <div>Price</div>
        <div className="text-right">Change %</div>
        <div className="text-right">Volume</div>
        <div className="text-right">Status</div>
        <div></div>
      </div>

      {/* Virtualized rows */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${startIndex * ROW_HEIGHT}px)` }}>
          {visibleSymbols.map((symbol, i) => {
            const idx = startIndex + i;
            const data = quotesMap?.get(symbol);
            return (
              <WatchlistRow
                key={symbol}
                symbol={symbol}
                data={data}
                watchlistId={watchlistId}
                onRemove={() => removeSymbol.mutate({ watchlistId, symbol })}
                onSelect={() => onSelectSymbol(symbol)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function WatchlistRow({
  symbol,
  data,
  watchlistId,
  onRemove,
  onSelect,
}: {
  symbol: string;
  data: QuoteWithState | undefined;
  watchlistId: string;
  onRemove: () => void;
  onSelect: () => void;
}) {
  const quote = data?.quote;
  const state: DataState = data?.state ?? 'unavailable';
  const isUp = quote ? quote.changePercent >= 0 : true;

  return (
    <div
      onClick={onSelect}
      className="group grid cursor-pointer grid-cols-[80px_1fr_100px_100px_120px_40px] items-center gap-2 border-b border-[#1a2236] px-4 transition-colors hover:bg-[#1a2236]"
      style={{ height: ROW_HEIGHT }}
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

      <div className="text-right">
        {quote ? (
          <span className={`font-mono text-sm font-medium ${isUp ? 'price-up' : 'price-down'}`}>
            {isUp ? '+' : ''}{quote.changePercent.toFixed(2)}%
          </span>
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

      <div className="flex justify-end">
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
