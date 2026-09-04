import { useState, useRef, useEffect } from 'react';
import { Plus, AlertCircle, ChevronDown, Search } from 'lucide-react';
import { useAddSymbol } from '../hooks';

interface AddSymbolProps {
  watchlistId: string;
}

const STOCK_DIRECTORY = [
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'MSFT', name: 'Microsoft Corporation' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.' },
  { symbol: 'GOOGL', name: 'Alphabet Inc. (Google)' },
  { symbol: 'META', name: 'Meta Platforms Inc.' },
  { symbol: 'TSLA', name: 'Tesla Inc.' },
  { symbol: 'AMD', name: 'Advanced Micro Devices' },
  { symbol: 'NFLX', name: 'Netflix Inc.' },
  { symbol: 'INTC', name: 'Intel Corporation' },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.' },
  { symbol: 'V', name: 'Visa Inc.' },
  { symbol: 'DIS', name: 'Walt Disney Co.' },
  { symbol: 'BA', name: 'Boeing Co.' },
  { symbol: 'PEP', name: 'PepsiCo Inc.' },
  { symbol: 'COST', name: 'Costco Wholesale' },
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF' },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust' },
  { symbol: 'PYPL', name: 'PayPal Holdings' },
  { symbol: 'CRM', name: 'Salesforce Inc.' },
];

export function AddSymbol({ watchlistId }: AddSymbolProps) {
  const [symbol, setSymbol] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const addSymbol = useAddSymbol();

  const filtered = STOCK_DIRECTORY.filter(
    (item) =>
      item.symbol.toLowerCase().includes(symbol.toLowerCase()) ||
      item.name.toLowerCase().includes(symbol.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddTicker = async (targetSymbol: string) => {
    const trimmed = targetSymbol.trim().toUpperCase();
    if (!trimmed) return;
    setError('');
    setIsOpen(false);
    try {
      await addSymbol.mutateAsync({ watchlistId, symbol: trimmed });
      setSymbol('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add symbol');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAddTicker(symbol);
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div className="relative" ref={dropdownRef}>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5a6478]" />
            <input
              type="text"
              value={symbol}
              onChange={(e) => {
                setSymbol(e.target.value.toUpperCase());
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              onKeyDown={handleKeyDown}
              placeholder="Search or pick stock (e.g. AAPL, MSFT, NVDA)..."
              className="input w-full pl-9 pr-8 uppercase text-sm"
              disabled={addSymbol.isPending}
            />
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5a6478] hover:text-[#e4e9f2]"
            >
              <ChevronDown size={16} />
            </button>
          </div>

          <button
            onClick={() => handleAddTicker(symbol)}
            disabled={!symbol.trim() || addSymbol.isPending}
            className="btn-primary flex items-center gap-1.5 px-4"
          >
            <Plus size={16} />
            Add Stock
          </button>
        </div>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute left-0 right-0 top-full z-40 mt-1 max-h-60 overflow-y-auto rounded-xl border border-[#1e2a44] bg-[#111729] p-1.5 shadow-2xl backdrop-blur-xl scrollbar-thin animate-fade-in">
            {filtered.length > 0 ? (
              filtered.map((item) => (
                <div
                  key={item.symbol}
                  onClick={() => handleAddTicker(item.symbol)}
                  className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 transition-all hover:bg-[#1a2236] hover:text-primary-300"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-[#e4e9f2]">{item.symbol}</span>
                    <span className="text-xs text-[#8b95a8]">— {item.name}</span>
                  </div>
                  <span className="text-xs font-semibold text-primary-400">+ Add</span>
                </div>
              ))
            ) : (
              <div
                onClick={() => handleAddTicker(symbol)}
                className="cursor-pointer rounded-lg p-2.5 text-xs text-primary-400 hover:bg-[#1a2236]"
              >
                Add custom ticker "<span className="font-mono font-bold">{symbol}</span>"
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Add Preset Pills */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="text-[#5a6478] font-medium mr-1">Popular Quick Add:</span>
        {['AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'GOOGL', 'META', 'AMD'].map((preset) => (
          <button
            key={preset}
            onClick={() => handleAddTicker(preset)}
            disabled={addSymbol.isPending}
            className="flex items-center gap-1 rounded-md border border-[#1e2a44] bg-[#111729] px-2 py-0.5 font-mono text-[11px] text-[#8b95a8] transition-all hover:border-primary-500/40 hover:bg-primary-500/10 hover:text-primary-300"
          >
            <Plus size={10} />
            {preset}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-error-400">
          <AlertCircle size={12} />
          {error}
        </div>
      )}
    </div>
  );
}
