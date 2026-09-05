import { useMemo } from 'react';
import { Sparkles, TrendingUp, TrendingDown, Activity, Zap, Flame, Award } from 'lucide-react';
import { useWatchlistEntries, useQuotes } from '../hooks';

interface ExecutiveSummaryProps {
  watchlistId: string | null;
}

export function ExecutiveSummary({ watchlistId }: ExecutiveSummaryProps) {
  const { data: entries } = useWatchlistEntries(watchlistId);
  const symbols = useMemo(() => (entries ?? []).map((e) => e.symbol), [entries]);
  const { data: quotesMap } = useQuotes(symbols);

  const analysis = useMemo(() => {
    if (!quotesMap || symbols.length === 0) return null;

    const quotes = symbols
      .map((s) => quotesMap.get(s)?.quote)
      .filter((q): q is NonNullable<typeof q> => q !== null && q !== undefined);

    if (quotes.length === 0) return null;

    const gainers = quotes.filter((q) => q.changePercent > 0);
    const losers = quotes.filter((q) => q.changePercent < 0);

    const totalChange = quotes.reduce((acc, q) => acc + q.changePercent, 0);
    const avgChange = totalChange / quotes.length;

    const sortedByChange = [...quotes].sort((a, b) => b.changePercent - a.changePercent);
    const topGainer = sortedByChange[0];
    const topLoser = sortedByChange[sortedByChange.length - 1];

    const volumeSpikes = quotes.filter((q) => q.volume > 2000000);
    const nearHighs = quotes.filter((q) => q.high >= (q.week52High ?? q.high) * 0.98);

    let sentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    let sentimentColor = 'text-primary-400 bg-primary-500/10 border-primary-500/30';
    if (avgChange > 0.5) {
      sentiment = 'bullish';
      sentimentColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    } else if (avgChange < -0.5) {
      sentiment = 'bearish';
      sentimentColor = 'text-rose-400 bg-rose-500/10 border-rose-500/30';
    }

    // Build narrative summary
    let summaryText = '';
    if (sentiment === 'bullish') {
      summaryText = `Watchlist is trending strongly upward (${avgChange >= 0 ? '+' : ''}${avgChange.toFixed(
        2
      )}% average gain). Led by ${topGainer?.symbol ?? 'top movers'} surging +${topGainer?.changePercent.toFixed(
        2
      )}% with ${gainers.length} out of ${quotes.length} stocks advancing.`;
    } else if (sentiment === 'bearish') {
      summaryText = `Watchlist is under selling pressure (${avgChange.toFixed(
        2
      )}% average drop). Weighted down by ${topLoser?.symbol ?? 'declining symbols'} (${topLoser?.changePercent.toFixed(
        2
      )}%), with ${losers.length} out of ${quotes.length} stocks in negative territory.`;
    } else {
      summaryText = `Watchlist is trading flat-to-mixed (${avgChange >= 0 ? '+' : ''}${avgChange.toFixed(
        2
      )}% average change). Gains in ${topGainer?.symbol ?? 'select symbols'} (+${topGainer?.changePercent.toFixed(
        2
      )}%) are balanced by pullbacks elsewhere.`;
    }

    return {
      sentiment,
      sentimentColor,
      avgChange,
      gainersCount: gainers.length,
      losersCount: losers.length,
      totalCount: quotes.length,
      topGainer,
      topLoser,
      volumeSpikesCount: volumeSpikes.length,
      nearHighsCount: nearHighs.length,
      summaryText,
    };
  }, [quotesMap, symbols]);

  if (!watchlistId || !analysis) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary-500/30 bg-gradient-to-r from-primary-950/40 via-[#111729] to-accent-950/30 p-5 backdrop-blur-xl">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Left: AI Narrative */}
        <div className="flex items-start gap-3.5 flex-1 min-w-0">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary-500/20 text-primary-300">
            <Sparkles size={20} />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-primary-400">
                AI Market Narrative
              </span>
              <span className={`badge ${analysis.sentimentColor} uppercase text-[10px] font-bold px-2 py-0.5`}>
                {analysis.sentiment}
              </span>
            </div>
            <p className="text-sm text-[#e4e9f2] font-medium leading-relaxed">
              {analysis.summaryText}
            </p>
          </div>
        </div>

        {/* Right: Quick Stats & Catalyst Counts */}
        <div className="flex flex-wrap items-center gap-2 flex-shrink-0 border-t border-[#1e2a44] pt-3 md:border-t-0 md:pt-0">
          {analysis.topGainer && (
            <div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-300">
              <Award size={12} />
              <span>Top: <strong>{analysis.topGainer.symbol}</strong> +{analysis.topGainer.changePercent.toFixed(1)}%</span>
            </div>
          )}

          {analysis.nearHighsCount > 0 && (
            <div className="flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-300">
              <Flame size={12} />
              <span>{analysis.nearHighsCount} Near 52W High</span>
            </div>
          )}

          {analysis.volumeSpikesCount > 0 && (
            <div className="flex items-center gap-1.5 rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-3 py-1.5 text-xs text-indigo-300">
              <Zap size={12} />
              <span>{analysis.volumeSpikesCount} High Vol</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
