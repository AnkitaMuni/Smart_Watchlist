import { useState } from 'react';
import { Plus, X, AlertCircle } from 'lucide-react';
import { useAddSymbol } from '../hooks';

interface AddSymbolProps {
  watchlistId: string;
}

export function AddSymbol({ watchlistId }: AddSymbolProps) {
  const [symbol, setSymbol] = useState('');
  const [error, setError] = useState('');
  const addSymbol = useAddSymbol();

  const handleAdd = async () => {
    const trimmed = symbol.trim();
    if (!trimmed) return;
    setError('');
    try {
      await addSymbol.mutateAsync({ watchlistId, symbol: trimmed });
      setSymbol('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add symbol');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd();
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        <input
          type="text"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          onKeyDown={handleKeyDown}
          placeholder="Add ticker (e.g. AAPL)"
          className="input flex-1 uppercase"
          disabled={addSymbol.isPending}
        />
        <button
          onClick={handleAdd}
          disabled={!symbol.trim() || addSymbol.isPending}
          className="btn-primary"
        >
          <Plus size={16} />
          Add
        </button>
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
