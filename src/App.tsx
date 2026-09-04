import { useState, useEffect } from 'react';
import { Eye, EyeOff, Activity } from 'lucide-react';
import { WatchlistSelector } from './ui/WatchlistSelector';
import { AddSymbol } from './ui/AddSymbol';
import { WhatChanged } from './ui/WhatChanged';
import { WatchlistTable } from './ui/WatchlistTable';
import { SymbolDetail } from './ui/SymbolDetail';
import { useWatchlists } from './hooks';

export default function App() {
  const { data: watchlists } = useWatchlists();
  const [activeWatchlistId, setActiveWatchlistId] = useState<string | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

  useEffect(() => {
    if (watchlists && watchlists.length > 0 && !activeWatchlistId) {
      setActiveWatchlistId(watchlists[0].id);
    }
  }, [watchlists, activeWatchlistId]);

  return (
    <div className="min-h-screen bg-[#0a0e1a]">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-[#1e2a44] bg-[#0a0e1a]/95 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/10">
                <Eye size={20} className="text-primary-400" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-[#e4e9f2]">Smart Watchlist</h1>
                <p className="text-xs text-[#5a6478]">What changed while you were away</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-lg border border-[#1e2a44] bg-[#111729] px-3 py-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-success-500" />
                </span>
                <span className="text-xs text-[#8b95a8]">Live demo data</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6">
        {/* Watchlist selector */}
        <WatchlistSelector activeId={activeWatchlistId} onSelect={setActiveWatchlistId} />

        {/* What changed panel */}
        {activeWatchlistId && (
          <WhatChanged watchlistId={activeWatchlistId} onSelectSymbol={setSelectedSymbol} />
        )}

        {/* Add symbol */}
        {activeWatchlistId && (
          <div className="card p-4">
            <AddSymbol watchlistId={activeWatchlistId} />
          </div>
        )}

        {/* Watchlist table */}
        <WatchlistTable watchlistId={activeWatchlistId} onSelectSymbol={setSelectedSymbol} />
      </main>

      {/* Symbol detail modal */}
      {selectedSymbol && activeWatchlistId && (
        <SymbolDetail
          symbol={selectedSymbol}
          watchlistId={activeWatchlistId}
          onClose={() => setSelectedSymbol(null)}
        />
      )}

      {/* Footer */}
      <footer className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex items-center justify-between border-t border-[#1e2a44] pt-6 text-xs text-[#5a6478]">
          <div className="flex items-center gap-2">
            <Activity size={12} />
            <span>Smart Watchlist — Hackathon build</span>
          </div>
          <div>Mock market data • Updates every 30s • IndexedDB persistence</div>
        </div>
      </footer>
    </div>
  );
}
