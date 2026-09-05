import { useState, useEffect } from 'react';
import { Eye, Activity, Cpu, LayoutGrid, Table, Bell, Columns } from 'lucide-react';
import { WatchlistSelector } from './ui/WatchlistSelector';
import { AddSymbol } from './ui/AddSymbol';
import { MarketPulse } from './ui/MarketPulse';
import { ExecutiveSummary } from './ui/ExecutiveSummary';
import { WhatChanged } from './ui/WhatChanged';
import { WatchlistTable } from './ui/WatchlistTable';
import { VolatilityHeatmap } from './ui/VolatilityHeatmap';
import { SymbolDetail } from './ui/SymbolDetail';
import { ArchitectureModal } from './ui/ArchitectureModal';
import { PriceAlertsModal } from './ui/PriceAlertsModal';
import { WatchlistCompareModal } from './ui/WatchlistCompareModal';
import { useWatchlists } from './hooks';

export default function App() {
  const { data: watchlists } = useWatchlists();
  const [activeWatchlistId, setActiveWatchlistId] = useState<string | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [showArchModal, setShowArchModal] = useState(false);
  const [showAlertsModal, setShowAlertsModal] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'heatmap'>('table');

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
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/10">
                <Eye size={20} className="text-primary-400" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-[#e4e9f2]">Smart Watchlist</h1>
                <p className="text-xs text-[#5a6478]">What changed while you were away</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              {/* Compare Watchlists Button */}
              <button
                onClick={() => setShowCompareModal(true)}
                className="flex items-center gap-1.5 rounded-lg border border-[#1e2a44] bg-[#111729] px-3 py-1.5 text-xs font-medium text-[#8b95a8] transition-colors hover:border-accent-500/40 hover:text-accent-300"
              >
                <Columns size={14} />
                <span>Compare Lists</span>
              </button>

              {/* Price Alerts Modal Button */}
              <button
                onClick={() => setShowAlertsModal(true)}
                className="flex items-center gap-1.5 rounded-lg border border-[#1e2a44] bg-[#111729] px-3 py-1.5 text-xs font-medium text-[#8b95a8] transition-colors hover:border-amber-500/40 hover:text-amber-300"
              >
                <Bell size={14} />
                <span>Price Alerts</span>
              </button>

              {/* Architecture & Telemetry Modal Trigger */}
              <button
                onClick={() => setShowArchModal(true)}
                className="flex items-center gap-1.5 rounded-lg border border-primary-500/30 bg-primary-500/10 px-3 py-1.5 text-xs font-semibold text-primary-300 transition-colors hover:bg-primary-500/20"
              >
                <Cpu size={14} />
                <span>Architecture & System Health</span>
              </button>

              <div className="flex items-center gap-1.5 rounded-lg border border-[#1e2a44] bg-[#111729] px-3 py-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-success-500" />
                </span>
                <span className="text-xs text-[#8b95a8]">Live Market Data</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6">
        {/* Watchlist selector & export/import */}
        <WatchlistSelector activeId={activeWatchlistId} onSelect={setActiveWatchlistId} />

        {/* AI Executive Market Summary Narrative */}
        {activeWatchlistId && <ExecutiveSummary watchlistId={activeWatchlistId} />}

        {/* What changed panel */}
        {activeWatchlistId && (
          <WhatChanged watchlistId={activeWatchlistId} onSelectSymbol={setSelectedSymbol} />
        )}

        {/* Add symbol & View mode switcher */}
        {activeWatchlistId && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1 card p-4">
              <AddSymbol watchlistId={activeWatchlistId} />
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center rounded-xl border border-[#1e2a44] bg-[#111729] p-1.5 self-start sm:self-auto">
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  viewMode === 'table' ? 'bg-primary-500/20 text-primary-400 font-bold' : 'text-[#5a6478] hover:text-[#8b95a8]'
                }`}
              >
                <Table size={14} />
                Table View
              </button>
              <button
                onClick={() => setViewMode('heatmap')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  viewMode === 'heatmap' ? 'bg-accent-500/20 text-accent-400 font-bold' : 'text-[#5a6478] hover:text-[#8b95a8]'
                }`}
              >
                <LayoutGrid size={14} />
                Heatmap Grid
              </button>
            </div>
          </div>
        )}

        {/* Global Market Pulse Ticker Overview */}
        <MarketPulse watchlistId={activeWatchlistId} onSelectSymbol={setSelectedSymbol} />

        {/* Watchlist main view (Table or Volatility Heatmap) */}
        {viewMode === 'table' ? (
          <WatchlistTable watchlistId={activeWatchlistId} onSelectSymbol={setSelectedSymbol} />
        ) : (
          <VolatilityHeatmap watchlistId={activeWatchlistId} onSelectSymbol={setSelectedSymbol} />
        )}
      </main>

      {/* Symbol detail modal */}
      {selectedSymbol && activeWatchlistId && (
        <SymbolDetail
          symbol={selectedSymbol}
          watchlistId={activeWatchlistId}
          onClose={() => setSelectedSymbol(null)}
        />
      )}

      {/* Architecture & Telemetry modal */}
      {showArchModal && <ArchitectureModal onClose={() => setShowArchModal(false)} />}

      {/* Price Alerts modal */}
      {showAlertsModal && <PriceAlertsModal onClose={() => setShowAlertsModal(false)} />}

      {/* Watchlist Compare modal */}
      {showCompareModal && (
        <WatchlistCompareModal
          currentWatchlistId={activeWatchlistId}
          onClose={() => setShowCompareModal(false)}
        />
      )}

      {/* Footer */}
      <footer className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-[#1e2a44] pt-6 text-xs text-[#5a6478]">
          <div className="flex items-center gap-2">
            <Activity size={12} />
            <span>Smart Watchlist — Code by Groww Hackathon Build</span>
          </div>
          <button
            onClick={() => setShowArchModal(true)}
            className="text-left text-[#8b95a8] hover:text-primary-400 transition-colors"
          >
            Powered by Finnhub API • Supabase Postgres & Dexie DB • System Telemetry
          </button>
        </div>
      </footer>
    </div>
  );
}
