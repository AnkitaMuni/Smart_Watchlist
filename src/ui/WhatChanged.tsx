import { useMemo, useState, useEffect, useRef } from 'react';
import { Activity, BarChart3, ArrowUpRight, ArrowDownRight, Filter, Clock } from 'lucide-react';
import type { ChangeScore } from '../types';
import { useWhatChanged, useQuotes, useMarkAsSeen, useWatchlistEntries } from '../hooks';

interface WhatChangedProps {
  watchlistId: string | null;
  onSelectSymbol: (symbol: string) => void;
}

type SensitivityMode = 'all' | 'moderate' | 'high';
type BaselineMode = 'last-seen' | 'prev-close' | 'day-open';

export function WhatChanged({ watchlistId, onSelectSymbol }: WhatChangedProps) {
  const { data: entries } = useWatchlistEntries(watchlistId);
  const symbols = useMemo(() => (entries ?? []).map((e) => e.symbol), [entries]);
  const { data: scores, isLoading } = useWhatChanged(symbols);
  const { data: quotesMap } = useQuotes(symbols);
  const markAsSeen = useMarkAsSeen();
  const hasMarked = useRef(false);

  const [sensitivity, setSensitivity] = useState<SensitivityMode>('all');
  const [baseline, setBaseline] = useState<BaselineMode>('last-seen');

  // Auto-mark as seen after 10 seconds so changes persist until next session
  useEffect(() => {
    hasMarked.current = false;
  }, [watchlistId]);

  useEffect(() => {
    if (!scores || scores.length === 0 || hasMarked.current) return;
    const significant = scores.filter((s) => s.compositeScore > 0);
    if (significant.length === 0) return;

    const timer = setTimeout(() => {
      const quotes = significant
        .map((s) => quotesMap?.get(s.symbol)?.quote)
        .filter((q): q is NonNullable<typeof q> => q !== null && q !== undefined);
      if (quotes.length > 0) {
        markAsSeen.mutate(quotes);
        hasMarked.current = true;
      }
    }, 12000);

    return () => clearTimeout(timer);
  }, [scores, quotesMap, markAsSeen]);

  // Adjust scores dynamically based on chosen baseline (last-seen vs prev-close vs day-open)
  const adjustedScores = useMemo(() => {
    if (!scores) return [];
    return scores.map((s) => {
      const quote = quotesMap?.get(s.symbol)?.quote;
      if (!quote) return s;

      let pct = s.priceChangePercent;
      let reason = s.topReason;
      let composite = s.compositeScore;

      if (baseline === 'prev-close' && quote.prevClose > 0) {
        pct = quote.changePercent;
        reason = `Move vs prev close: ${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
        composite = Math.min(1, Math.max(0.1, Math.abs(pct) / 5 + (quote.volume > 2000000 ? 0.2 : 0)));
      } else if (baseline === 'day-open' && quote.open > 0) {
        pct = ((quote.price - quote.open) / quote.open) * 100;
        reason = `Move vs day open: ${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
        composite = Math.min(1, Math.max(0.1, Math.abs(pct) / 5 + (quote.volume > 2000000 ? 0.2 : 0)));
      } else if (baseline === 'last-seen') {
        if (pct === 0 && quote.changePercent !== 0) {
          pct = quote.changePercent;
          reason = `Daily move: ${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
          composite = Math.min(1, Math.max(0.1, Math.abs(pct) / 5 + (quote.volume > 2000000 ? 0.2 : 0)));
        }
      }

      return {
        ...s,
        priceChangePercent: pct,
        topReason: reason,
        compositeScore: composite || s.compositeScore,
      };
    });
  }, [scores, quotesMap, baseline]);

  // Filter based on sensitivity selection
  const filteredScores = useMemo(() => {
    return adjustedScores
      .filter((s) => {
        if (sensitivity === 'high') return Math.abs(s.priceChangePercent) >= 3 || s.compositeScore > 0.4;
        if (sensitivity === 'moderate') return Math.abs(s.priceChangePercent) >= 1 || s.compositeScore > 0.2;
        return true;
      })
      .sort((a, b) => b.compositeScore - a.compositeScore);
  }, [adjustedScores, sensitivity]);

  const lastCheckedTime = filteredScores.length > 0
    ? Math.min(...filteredScores.map((s) => s.lastSeenAt || Date.now()))
    : null;

  if (isLoading) {
    return (
      <div className="card p-6">
        <div className="animate-pulse-soft text-sm text-[#5a6478]">Analyzing what changed...</div>
      </div>
    );
  }

  if (symbols.length === 0) return null;

  return (
    <div className="card p-5">
      {/* Header with Title & Filter Controls */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-500/10">
            <Activity size={16} className="text-primary-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[#e4e9f2]">What Changed Since You Last Checked</h2>
            {lastCheckedTime && lastCheckedTime > 0 && (
              <p className="text-xs text-[#5a6478]">Last checked {timeAgo(lastCheckedTime)}</p>
            )}
          </div>
        </div>

        {/* Sensitivity & Baseline Filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Baseline Picker */}
          <div className="flex items-center rounded-lg border border-[#1e2a44] bg-[#111729] p-1">
            <Clock size={12} className="ml-1.5 mr-1 text-[#5a6478]" />
            <button
              onClick={() => setBaseline('last-seen')}
              className={`rounded px-2 py-0.5 transition-colors ${
                baseline === 'last-seen' ? 'bg-primary-500/20 text-primary-400 font-medium' : 'text-[#5a6478]'
              }`}
            >
              Last Seen
            </button>
            <button
              onClick={() => setBaseline('prev-close')}
              className={`rounded px-2 py-0.5 transition-colors ${
                baseline === 'prev-close' ? 'bg-primary-500/20 text-primary-400 font-medium' : 'text-[#5a6478]'
              }`}
            >
              Prev Close
            </button>
            <button
              onClick={() => setBaseline('day-open')}
              className={`rounded px-2 py-0.5 transition-colors ${
                baseline === 'day-open' ? 'bg-primary-500/20 text-primary-400 font-medium' : 'text-[#5a6478]'
              }`}
            >
              Day Open
            </button>
          </div>

          {/* Sensitivity Filter */}
          <div className="flex items-center rounded-lg border border-[#1e2a44] bg-[#111729] p-1">
            <Filter size={12} className="ml-1.5 mr-1 text-[#5a6478]" />
            <button
              onClick={() => setSensitivity('all')}
              className={`rounded px-2 py-0.5 transition-colors ${
                sensitivity === 'all' ? 'bg-accent-500/20 text-accent-400 font-medium' : 'text-[#5a6478]'
              }`}
            >
              All Moves
            </button>
            <button
              onClick={() => setSensitivity('moderate')}
              className={`rounded px-2 py-0.5 transition-colors ${
                sensitivity === 'moderate' ? 'bg-accent-500/20 text-accent-400 font-medium' : 'text-[#5a6478]'
              }`}
            >
              &gt;1%
            </button>
            <button
              onClick={() => setSensitivity('high')}
              className={`rounded px-2 py-0.5 transition-colors ${
                sensitivity === 'high' ? 'bg-accent-500/20 text-accent-400 font-medium' : 'text-[#5a6478]'
              }`}
            >
              &gt;3% High
            </button>
          </div>
        </div>
      </div>

      {filteredScores.length === 0 ? (
        <div className="py-4 text-center text-xs text-[#5a6478]">
          No changes matched the selected filter criteria ({sensitivity.toUpperCase()}).
        </div>
      ) : (
        <div className="space-y-2">
          {filteredScores.slice(0, 8).map((score, idx) => (
            <WhatChangedRow key={score.symbol} score={score} rank={idx + 1} onSelect={onSelectSymbol} />
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between text-xs text-[#5a6478]">
        <span>Showing {filteredScores.length} detected signals</span>
        <span>Auto-syncs session snapshots</span>
      </div>
    </div>
  );
}

function WhatChangedRow({ score, rank, onSelect }: { score: ChangeScore; rank: number; onSelect: (s: string) => void }) {
  const isUp = score.priceChangePercent >= 0;
  const scoreColor = score.compositeScore > 0.5
    ? 'text-warning-400 bg-warning-500/10'
    : score.compositeScore > 0.25
    ? 'text-primary-400 bg-primary-500/10'
    : 'text-[#8b95a8] bg-[#1a2236]';

  return (
    <div
      onClick={() => onSelect(score.symbol)}
      className="group flex items-center gap-3 rounded-lg border border-transparent p-3 transition-all cursor-pointer hover:border-[#2a3550] hover:bg-[#1a2236] animate-fade-in"
    >
      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-[#1a2236] text-xs font-bold text-[#5a6478]">
        {rank}
      </div>

      <div className="flex w-20 flex-shrink-0 flex-col">
        <span className="font-mono text-sm font-semibold text-[#e4e9f2]">{score.symbol}</span>
      </div>

      <div className="flex flex-1 items-center gap-2 min-w-0">
        {isUp ? (
          <ArrowUpRight size={14} className="flex-shrink-0 text-success-400" />
        ) : (
          <ArrowDownRight size={14} className="flex-shrink-0 text-error-400" />
        )}
        <span className={`text-sm font-medium ${isUp ? 'price-up' : 'price-down'}`}>
          {isUp ? '+' : ''}{score.priceChangePercent.toFixed(1)}%
        </span>
        <span className="truncate text-sm text-[#8b95a8]">{score.topReason}</span>
      </div>

      <div className="flex flex-shrink-0 items-center gap-2">
        {score.subScores.find((s) => s.type === 'volume-spike' && s.score > 0) && (
          <span className="badge bg-accent-500/10 text-accent-400">
            <BarChart3 size={10} className="mr-1" />
            Vol
          </span>
        )}
        <span className={`badge ${scoreColor}`}>
          {(score.compositeScore * 100).toFixed(0)}
        </span>
      </div>
    </div>
  );
}

function timeAgo(timestamp: number): string {
  if (!timestamp) return 'never';
  const diff = Date.now() - timestamp;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} hr ago`;
  return `${Math.floor(diff / 86400000)} day${Math.floor(diff / 86400000) > 1 ? 's' : ''} ago`;
}
