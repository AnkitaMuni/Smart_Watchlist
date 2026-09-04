import { useState } from 'react';
import { Plus, Trash2, Check, Pencil, List } from 'lucide-react';
import { useWatchlists, useCreateWatchlist, useRenameWatchlist, useDeleteWatchlist } from '../hooks';
import type { Watchlist } from '../types';

interface WatchlistSelectorProps {
  activeId: string | null;
  onSelect: (id: string) => void;
}

export function WatchlistSelector({ activeId, onSelect }: WatchlistSelectorProps) {
  const { data: watchlists } = useWatchlists();
  const createList = useCreateWatchlist();
  const renameList = useRenameWatchlist();
  const deleteList = useDeleteWatchlist();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const id = await createList.mutateAsync(newName.trim());
    onSelect(id);
    setNewName('');
    setCreating(false);
  };

  const handleRename = async (id: string) => {
    if (!editName.trim()) return;
    await renameList.mutateAsync({ id, name: editName.trim() });
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    await deleteList.mutateAsync(id);
    const remaining = watchlists?.filter((w) => w.id !== id);
    if (remaining && remaining.length > 0) {
      onSelect(remaining[0].id);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {watchlists?.map((wl: Watchlist) => (
        <div key={wl.id} className="flex items-center group">
          {editingId === wl.id ? (
            <div className="flex items-center gap-1">
              <input
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRename(wl.id)}
                onBlur={() => handleRename(wl.id)}
                className="input px-2 py-1 text-sm"
              />
              <button onClick={() => handleRename(wl.id)} className="btn-ghost p-1">
                <Check size={14} />
              </button>
            </div>
          ) : (
            <div
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-all cursor-pointer ${
                activeId === wl.id
                  ? 'border-primary-500/50 bg-primary-500/10 text-primary-300'
                  : 'border-[#1e2a44] bg-[#111729] text-[#8b95a8] hover:border-[#2a3550] hover:text-[#e4e9f2]'
              }`}
              onClick={() => onSelect(wl.id)}
            >
              <List size={14} />
              <span className="font-medium">{wl.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingId(wl.id);
                  setEditName(wl.name);
                }}
                className="ml-1 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <Pencil size={12} className="text-[#5a6478] hover:text-primary-400" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(wl.id);
                }}
                className="opacity-0 transition-opacity group-hover:opacity-100"
              >
                <Trash2 size={12} className="text-[#5a6478] hover:text-error-400" />
              </button>
            </div>
          )}
        </div>
      ))}

      {creating ? (
        <div className="flex items-center gap-1.5">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            onBlur={() => !newName.trim() && setCreating(false)}
            placeholder="Watchlist name"
            className="input px-2 py-1.5 text-sm"
          />
          <button onClick={handleCreate} className="btn-ghost p-1">
            <Check size={14} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 rounded-lg border border-dashed border-[#2a3550] px-3 py-1.5 text-sm text-[#5a6478] transition-colors hover:border-primary-500/40 hover:text-primary-400"
        >
          <Plus size={14} />
          New List
        </button>
      )}
    </div>
  );
}
