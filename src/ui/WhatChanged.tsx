import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Activity, BarChart3, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import type { ChangeScore } from '../types';
import { useWhatChanged, useQuotes, useMarkAsSeen, useWatchlistEntries } from '../hooks';
import { useEffect, useRef } from 'react';

interface WhatChangedProps {
  watchlistId: string | null;
  onSelectSymbol: (symbol: string) => void;
}

export function WhatChanged({ watchlistId, onSelectSymbol }: WhatChangedProps) {
  const { data: entries } = useWatchlistEntries(watchlistId);
  const symbols = useMemo(() => (entries ?? []).map((e) => e.symbol), [entries]);
  const { data: scores, isLoading } = useWhatChanged(symbols);
  const { data: quotesMap } = useQuotes(symbols);
  const markAsSeen = useMarkAsSeen();
  const hasMarked = useRef(false);

  // Auto-mark as seen after a delay so the panel shows changes, then resets on watchlist switch
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
    }, 10000);

    return () => clearTimeout(timer);
  }, [scores, quotesMap, markAsSeen]);

  const significantScores = (scores ?? []).filter((s) => s.compositeScore > 0.01);
  const lastCheckedTime = significantScores.length > 0
    ? Math.min(...significantScores.map((s) => s.lastSeenAt))
    : null;

  if (isLoading) {
    return (
      <div className="card p-6">
        <div className="animate-pulse-soft text-sm text-[#5a6478]">Analyzing what changed...</div>
      </div>
    );
  }

  if (symbols.length === 0) {
    return null;
  }

  if (significantScores.length === 0) {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-2 text-[#8b95a8]">
          <Activity size={18} className="text-success-400" />
          <span className="text-sm">
            Nothing meaningful has changed since you last checked.{' '}
            {lastCheckedTime && (
              <span className="text-[#5a6478]">
                Last checked {timeAgo(lastCheckedTime)}
              </span>
            )}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-500/10">
            <Activity size={16} className="text-primary-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[#e4e9f2]">What Changed Since You Last Checked</h2>
            {lastCheckedTime && (
              <p className="text-xs text-[#5a6478]">Last checked {timeAgo(lastCheckedTime)}</p>
            )}
          </div>
        </div>
        <span className="badge bg-primary-500/10 text-primary-400">
          {significantScores.length} {significantScores.length === 1 ? 'alert' : 'alerts'}
        </span>
      </div>

      <div className="space-y-2">
        {significantScores.slice(0, 8).map((score, idx) => (
          <WhatChangedRow key={score.symbol} score={score} rank={idx + 1} onSelect={onSelectSymbol} />
        ))}
      </div>
      <p className="mt-3 text-xs text-[#5a6478]">
        Changes will be marked as seen after 10 seconds. This panel updates automatically.
      </p>
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
