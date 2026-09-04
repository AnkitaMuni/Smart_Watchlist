import { useQuotes } from '../hooks';
import { TrendingUp, TrendingDown, Plus, Globe } from 'lucide-react';
import { useAddSymbol } from '../hooks';

interface MarketPulseProps {
  watchlistId: string | null;
  onSelectSymbol: (symbol: string) => void;
}

const POPULAR_MARKET_SYMBOLS = [
  'AAPL',
  'MSFT',
  'NVDA',
  'AMZN',
  'GOOGL',
  'META',
  'TSLA',
  'AMD',
  'NFLX',
  'INTC',
  'SPY',
  'QQQ',
];

export function MarketPulse({ watchlistId, onSelectSymbol }: MarketPulseProps) {
  const { data: quotesMap, isLoading } = useQuotes(POPULAR_MARKET_SYMBOLS);
  const addSymbol = useAddSymbol();

  const handleQuickAdd = async (e: React.MouseEvent, sym: string) => {
    e.stopPropagation();
    if (!watchlistId) return;
    try {
      await addSymbol.mutateAsync({ watchlistId, symbol: sym });
    } catch {
      // Handled gracefully
    }
  };

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe size={16} className="text-primary-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#e4e9f2]">
            Global Market Pulse & Live Tickers
          </h3>
        </div>
        <span className="text-[11px] text-[#5a6478]">Click to inspect • + to add to list</span>
      </div>

      {isLoading && !quotesMap ? (
        <div className="animate-pulse-soft py-3 text-xs text-[#5a6478]">
          Loading live market symbols...
        </div>
      ) : (
        <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-thin">
          {POPULAR_MARKET_SYMBOLS.map((sym) => {
            const q = quotesMap?.get(sym)?.quote;
            const price = q?.price ?? 0;
            const change = q?.changePercent ?? 0;
            const isUp = change >= 0;

            return (
              <div
                key={sym}
                onClick={() => onSelectSymbol(sym)}
                className="group flex flex-shrink-0 cursor-pointer items-center gap-2.5 rounded-lg border border-[#1e2a44] bg-[#111729] px-3 py-2 transition-all hover:border-primary-500/40 hover:bg-[#1a2236]"
              >
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold text-[#e4e9f2]">{sym}</span>
                    {isUp ? (
                      <TrendingUp size={12} className="text-emerald-400" />
                    ) : (
                      <TrendingDown size={12} className="text-rose-400" />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-mono text-xs font-semibold text-[#8b95a8]">
                      ${price > 0 ? price.toFixed(2) : '—'}
                    </span>
                    <span
                      className={`font-mono text-[11px] font-medium ${
                        isUp ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isUp ? '+' : ''}
                      {change.toFixed(2)}%
                    </span>
                  </div>
                </div>

                {watchlistId && (
                  <button
                    onClick={(e) => handleQuickAdd(e, sym)}
                    className="flex h-6 w-6 items-center justify-center rounded-md border border-[#1e2a44] bg-[#1a2236] text-[#5a6478] transition-all hover:border-primary-500/50 hover:bg-primary-500/20 hover:text-primary-300"
                    title={`Add ${sym} to current watchlist`}
                  >
                    <Plus size={12} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
