import { useState } from 'react';
import { X, TrendingUp, TrendingDown, BarChart3, Activity, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts';
import { useHistory, useQuotes, useLastViewed } from '../hooks';
import { computeCompositeScore } from '../scoring';
import type { PricePoint } from '../types';

interface SymbolDetailProps {
  symbol: string;
  watchlistId: string;
  onClose: () => void;
}

const RANGES = ['1D', '1W', '1M', '3M', '1Y'] as const;

export function SymbolDetail({ symbol, watchlistId, onClose }: SymbolDetailProps) {
  const [range, setRange] = useState<(typeof RANGES)[number]>('1M');
  const { data: history } = useHistory(symbol, range);
  const { data: quotesMap } = useQuotes([symbol]);
  const { data: lastViewed } = useLastViewed(symbol);

  const quote = quotesMap?.get(symbol)?.quote ?? null;
  const state = quotesMap?.get(symbol)?.state ?? 'loading';
  const stateMessage = quotesMap?.get(symbol)?.stateMessage ?? '';

  const historyPoints: PricePoint[] = history?.points ?? [];
  const score = quote && lastViewed
    ? computeCompositeScore(quote, lastViewed, historyPoints)
    : null;

  const chartData = historyPoints.map((p) => ({
    time: range === '1D'
      ? new Date(p.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      : new Date(p.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    price: p.price,
    volume: p.volume,
  }));

  const isUp = quote ? quote.changePercent >= 0 : true;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        className="card mt-8 w-full max-w-3xl p-6 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-500/10">
              {isUp ? <TrendingUp size={22} className="text-success-400" /> : <TrendingDown size={22} className="text-error-400" />}
            </div>
            <div>
              <h2 className="font-mono text-xl font-bold text-[#e4e9f2]">{symbol}</h2>
              {quote && (
                <div className="flex items-center gap-2">
                  <span className="font-mono text-lg text-[#e4e9f2]">${quote.price.toFixed(2)}</span>
                  <span className={`text-sm font-medium ${isUp ? 'price-up' : 'price-down'}`}>
                    {isUp ? '+' : ''}{quote.changePercent.toFixed(2)}%
                  </span>
                </div>
              )}
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost p-2">
            <X size={18} />
          </button>
        </div>

        {/* Data state */}
        <div className="mb-4 flex items-center gap-2 text-xs text-[#5a6478]">
          <span className={`badge ${
            state === 'live' ? 'bg-success-500/10 text-success-400' :
            state === 'cached' ? 'bg-primary-500/10 text-primary-400' :
            state === 'stale' ? 'bg-warning-500/10 text-warning-400' :
            state === 'market-closed' ? 'bg-[#1a2236] text-[#8b95a8]' :
            'bg-error-500/10 text-error-400'
          }`}>
            {stateMessage}
          </span>
        </div>

        {/* Chart */}
        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium text-[#8b95a8]">Price History</h3>
            <div className="flex gap-1">
              {RANGES.map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    range === r
                      ? 'bg-primary-500/15 text-primary-400'
                      : 'text-[#5a6478] hover:bg-[#1a2236] hover:text-[#8b95a8]'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {chartData.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                  <XAxis dataKey="time" tick={{ fill: '#5a6478', fontSize: 11 }} axisLine={{ stroke: '#1e2a44' }} tickLine={false} />
                  <YAxis tick={{ fill: '#5a6478', fontSize: 11 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#111729',
                      border: '1px solid #1e2a44',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    labelStyle={{ color: '#8b95a8' }}
                  />
                  {lastViewed && (
                    <ReferenceLine
                      y={lastViewed.lastPrice}
                      stroke="#337bff"
                      strokeDasharray="4 4"
                      label={{ value: 'Last seen', fill: '#337bff', fontSize: 10, position: 'insideTopRight' }}
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke={isUp ? '#34d399' : '#f87171'}
                    strokeWidth={2}
                    dot={false}
                    animationDuration={300}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center text-sm text-[#5a6478]">
              No historical data available
            </div>
          )}
        </div>

        {/* Key stats */}
        {quote && (
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatBox label="Open" value={`$${(quote.open ?? quote.price).toFixed(2)}`} />
            <StatBox label="Prev Close" value={`$${(quote.prevClose ?? quote.price).toFixed(2)}`} />
            <StatBox label="Day High" value={`$${(quote.high ?? quote.price).toFixed(2)}`} />
            <StatBox label="Day Low" value={`$${(quote.low ?? quote.price).toFixed(2)}`} />
            <StatBox label="52W High" value={`$${(quote.week52High ?? quote.price * 1.15).toFixed(2)}`} />
            <StatBox label="52W Low" value={`$${(quote.week52Low ?? quote.price * 0.85).toFixed(2)}`} />
            <StatBox label="Volume" value={formatVolume(quote.volume ?? 0)} />
            <StatBox label="Change" value={`$${(quote.change ?? 0).toFixed(2)}`} valueClass={isUp ? 'price-up' : 'price-down'} />
          </div>
        )}

        {/* Change breakdown */}
        {score && score.subScores.length > 0 && (
          <div>
            <h3 className="mb-3 text-sm font-medium text-[#8b95a8]">Why This Appeared in "What Changed"</h3>
            <div className="space-y-2">
              {score.subScores.map((sub) => (
                <div key={sub.type} className="flex items-center gap-3 rounded-lg border border-[#1a2236] bg-[#0a0e1a] p-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#1a2236]">
                    {getScoreIcon(sub.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#e4e9f2]">{sub.reason}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-20 overflow-hidden rounded-full bg-[#1a2236]">
                      <div
                        className="h-full rounded-full bg-primary-500"
                        style={{ width: `${sub.score * 100}%` }}
                      />
                    </div>
                    <span className="font-mono text-xs text-[#8b95a8] w-8 text-right">
                      {(sub.score * 100).toFixed(0)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between rounded-lg border border-[#1e2a44] bg-[#1a2236] p-3">
              <span className="text-sm font-medium text-[#e4e9f2]">Composite Score</span>
              <span className="font-mono text-lg font-bold text-primary-400">
                {(score.compositeScore * 100).toFixed(0)}
              </span>
            </div>
          </div>
        )}

        {lastViewed && (
          <div className="mt-4 text-xs text-[#5a6478]">
            Last seen: ${lastViewed.lastPrice.toFixed(2)} on {new Date(lastViewed.lastViewedAt).toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
}

function StatBox({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="rounded-lg border border-[#1a2236] bg-[#0a0e1a] p-3">
      <div className="text-xs text-[#5a6478]">{label}</div>
      <div className={`font-mono text-sm font-medium ${valueClass ?? 'text-[#e4e9f2]'}`}>{value}</div>
    </div>
  );
}

function getScoreIcon(type: string) {
  switch (type) {
    case 'price-move':
      return <Activity size={14} className="text-primary-400" />;
    case 'volume-spike':
      return <BarChart3 size={14} className="text-accent-400" />;
    case 'direction-reversal':
      return <ArrowUpRight size={14} className="text-warning-400" />;
    case 'new-52-high':
      return <TrendingUp size={14} className="text-success-400" />;
    case 'new-52-low':
      return <TrendingDown size={14} className="text-error-400" />;
    case 'gap-hold':
      return <ArrowUpRight size={14} className="text-primary-400" />;
    case 'gap-fade':
      return <ArrowDownRight size={14} className="text-error-400" />;
    default:
      return <Activity size={14} className="text-[#8b95a8]" />;
  }
}

function formatVolume(vol: number): string {
  if (vol >= 1e9) return `${(vol / 1e9).toFixed(1)}B`;
  if (vol >= 1e6) return `${(vol / 1e6).toFixed(1)}M`;
  if (vol >= 1e3) return `${(vol / 1e3).toFixed(1)}K`;
  return vol.toString();
}
