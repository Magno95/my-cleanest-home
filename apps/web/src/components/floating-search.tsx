import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Sparkles } from 'lucide-react';
import { cn, Input } from '@mch/ui';
import type { ItemSummary } from '../features/items/use-items.js';
import type { RoomSummary } from '../features/rooms/use-rooms.js';

interface FloatingSearchProps {
  items: ItemSummary[];
  rooms: RoomSummary[];
  onSelect: (item: ItemSummary) => void;
}

/**
 * Sticky centered search input. Filters items by name (case-insensitive),
 * shows a dropdown of matches with the room pill. Clicking a result fires
 * `onSelect` so the parent can open the item detail dialog.
 */
export function FloatingSearch({ items, rooms, onSelect }: FloatingSearchProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const roomsById = useMemo(() => new Map(rooms.map((r) => [r.id, r] as const)), [rooms]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, 6);
    return items.filter((it) => it.name.toLowerCase().includes(q)).slice(0, 8);
  }, [items, query]);

  // Close dropdown on outside click.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <div ref={containerRef} className="relative w-full max-w-xl">
      <div className="relative flex items-center rounded-full border border-border bg-background px-5 py-2.5 shadow-card transition-shadow focus-within:shadow-hover">
        <Search size={18} aria-hidden className="text-foreground-muted" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Search an item to clean…"
          className="h-9 border-0 bg-transparent px-3 text-sm focus-visible:ring-0"
        />
        <kbd className="hidden rounded border border-border bg-surface-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground-muted sm:inline-block">
          /
        </kbd>
      </div>

      {open ? (
        <div className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-border bg-background shadow-hover">
          {results.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-foreground-muted">
              No items match &ldquo;{query}&rdquo;.
            </div>
          ) : (
            <ul className="max-h-72 overflow-auto py-1">
              {results.map((item) => {
                const room = item.roomId ? (roomsById.get(item.roomId) ?? null) : null;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelect(item);
                        setOpen(false);
                        setQuery('');
                      }}
                      className={cn(
                        'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-muted',
                      )}
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-muted text-foreground">
                        <Sparkles size={14} aria-hidden />
                      </span>
                      <span className="flex flex-1 flex-col">
                        <span className="text-sm font-medium text-foreground">{item.name}</span>
                        {room ? (
                          <span className="text-xs text-foreground-muted">{room.name}</span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
