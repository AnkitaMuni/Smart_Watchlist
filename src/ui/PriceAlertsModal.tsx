import { useState, useEffect } from 'react';
import { X, Bell, Plus, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useQuotes } from '../hooks';

interface CustomAlert {
  id: string;
  symbol: string;
  condition: 'price_above' | 'price_below' | 'change_above' | 'change_below';
  targetValue: number;
  createdAt: number;
}

interface PriceAlertsModalProps {
  onClose: () => void;
}

export function PriceAlertsModal({ onClose }: PriceAlertsModalProps) {
  const [alerts, setAlerts] = useState<CustomAlert[]>(() => {
    try {
      const saved = localStorage.getItem('smart_watchlist_custom_alerts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [symbol, setSymbol] = useState('AAPL');
  const [condition, setCondition] = useState<CustomAlert['condition']>('price_above');
  const [targetValue, setTargetValue] = useState('200');

  const symbolsToMonitor = Array.from(new Set(alerts.map((a) => a.symbol)));
  const { data: quotesMap } = useQuotes(symbolsToMonitor);

  useEffect(() => {
    try {
      localStorage.setItem('smart_watchlist_custom_alerts', JSON.stringify(alerts));
    } catch {
      // Ignored
    }
  }, [alerts]);

  const handleAddAlert = () => {
    const sym = symbol.trim().toUpperCase();
    const val = parseFloat(targetValue);
    if (!sym || isNaN(val)) return;

    const newAlert: CustomAlert = {
      id: crypto.randomUUID(),
      symbol: sym,
      condition,
      targetValue: val,
      createdAt: Date.now(),
    };

    setAlerts([newAlert, ...alerts]);
    setSymbol('');
    setTargetValue('');
  };

  const handleDeleteAlert = (id: string) => {
    setAlerts(alerts.filter((a) => a.id !== id));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="card my-8 w-full max-w-2xl p-6 sm:p-8 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-6 flex items-start justify-between border-b border-[#1e2a44] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
              <Bell size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#e4e9f2]">Custom Price & Volume Alerts</h2>
              <p className="text-xs text-[#8b95a8]">Set threshold notifications for target stock price movements</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost p-2 text-[#8b95a8] hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Create Alert Controls */}
        <div className="mb-6 rounded-xl border border-[#1e2a44] bg-[#111729] p-4 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-primary-400">Add New Price Trigger</h3>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-4">
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="Symbol (e.g. AAPL)"
              className="input uppercase text-xs"
            />
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as CustomAlert['condition'])}
              className="input text-xs"
            >
              <option value="price_above">Price &gt; Target ($)</option>
              <option value="price_below">Price &lt; Target ($)</option>
              <option value="change_above">Gain &gt; Target (%)</option>
              <option value="change_below">Loss &gt; Target (%)</option>
            </select>
            <input
              type="number"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              placeholder="Target Value"
              className="input text-xs"
            />
            <button onClick={handleAddAlert} className="btn-primary flex items-center justify-center gap-1 text-xs">
              <Plus size={14} /> Set Alert
            </button>
          </div>
        </div>

        {/* Active Alerts List */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#8b95a8]">Active Alert Monitors ({alerts.length})</h3>
          {alerts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#1e2a44] p-6 text-center text-xs text-[#5a6478]">
              No custom alerts configured yet. Add a stock threshold above.
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
              {alerts.map((a) => {
                const quote = quotesMap?.get(a.symbol)?.quote;
                const price = quote?.price ?? 0;
                const change = quote?.changePercent ?? 0;

                let triggered = false;
                if (quote) {
                  if (a.condition === 'price_above' && price >= a.targetValue) triggered = true;
                  if (a.condition === 'price_below' && price <= a.targetValue) triggered = true;
                  if (a.condition === 'change_above' && change >= a.targetValue) triggered = true;
                  if (a.condition === 'change_below' && change <= -Math.abs(a.targetValue)) triggered = true;
                }

                return (
                  <div
                    key={a.id}
                    className={`flex items-center justify-between rounded-xl border p-3 text-xs transition-all ${
                      triggered
                        ? 'border-amber-500/50 bg-amber-500/10 text-amber-200'
                        : 'border-[#1e2a44] bg-[#0a0e1a] text-[#8b95a8]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-bold text-[#e4e9f2]">{a.symbol}</span>
                      <span>
                        {a.condition === 'price_above' && `Price > $${a.targetValue}`}
                        {a.condition === 'price_below' && `Price < $${a.targetValue}`}
                        {a.condition === 'change_above' && `Gain > ${a.targetValue}%`}
                        {a.condition === 'change_below' && `Loss > ${a.targetValue}%`}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {quote && (
                        <span className="font-mono text-xs font-semibold text-[#e4e9f2]">
                          Live: ${price.toFixed(2)} ({change >= 0 ? '+' : ''}{change.toFixed(2)}%)
                        </span>
                      )}

                      {triggered ? (
                        <span className="badge bg-amber-500/20 text-amber-300 font-bold flex items-center gap-1">
                          <AlertTriangle size={12} /> TRIGGERED
                        </span>
                      ) : (
                        <span className="badge bg-emerald-500/10 text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 size={12} /> Active
                        </span>
                      )}

                      <button
                        onClick={() => handleDeleteAlert(a.id)}
                        className="rounded p-1 text-[#5a6478] hover:text-rose-400 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
