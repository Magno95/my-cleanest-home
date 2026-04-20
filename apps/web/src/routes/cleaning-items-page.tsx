import { useMemo, useState } from 'react';
import { DoorOpen, Sparkles } from 'lucide-react';
import { Card, CardDescription, CardHeader, CardTitle, Spinner } from '@mch/ui';
import { NoActiveHomeCard } from '../components/no-active-home-card.js';
import { useActiveHome } from '../features/active-home/use-active-home.js';
import { useItems, type ItemSummary } from '../features/items/use-items.js';
import { useRooms } from '../features/rooms/use-rooms.js';
import { ItemDetailDialog } from '../features/items/ItemDetailDialog.js';
import { MISCELLANEOUS_ROOM_NAME } from '../features/rooms/miscellaneous-room.js';

/**
 * Full listing of cleaning items grouped by room. Clicking an item opens
 * the same detail dialog used elsewhere.
 */
export function CleaningItemsPage() {
  const { home, isLoading: activeLoading } = useActiveHome();
  const itemsQuery = useItems(home?.id);
  const roomsQuery = useRooms(home?.id ?? '');

  const [detailItem, setDetailItem] = useState<ItemSummary | null>(null);

  const rooms = roomsQuery.data ?? [];
  const items = itemsQuery.data ?? [];
  const miscellaneousRoom = useMemo(
    () => rooms.find((room) => room.name === MISCELLANEOUS_ROOM_NAME) ?? null,
    [rooms],
  );

  const itemsByRoom = useMemo(() => {
    const map = new Map<string | null, ItemSummary[]>();
    for (const it of items) {
      const key = it.roomId ?? miscellaneousRoom?.id ?? null;
      const bucket = map.get(key) ?? [];
      bucket.push(it);
      map.set(key, bucket);
    }
    return map;
  }, [items, miscellaneousRoom?.id]);

  if (activeLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Spinner size={28} label="Loading" />
      </div>
    );
  }

  if (!home) {
    return <NoActiveHomeCard />;
  }

  const loading = itemsQuery.isLoading || roomsQuery.isLoading;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tighter text-foreground">Cleaning items</h1>
        <p className="text-sm text-foreground-muted">
          {items.length} item{items.length === 1 ? '' : 's'} across {rooms.length} room
          {rooms.length === 1 ? '' : 's'} in {home.name}.
        </p>
      </header>

      {loading ? (
        <div className="flex h-96 items-center justify-center">
          <Spinner size={28} label="Loading items" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">No items yet</CardTitle>
            <CardDescription>
              Use the &ldquo;New cleaning item&rdquo; button on the dashboard to add one.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          {rooms.map((room) => {
            const key = room.id;
            const group = itemsByRoom.get(key) ?? [];
            if (group.length === 0) return null;
            return (
              <section key={key} className="flex flex-col gap-2">
                <header className="flex items-center gap-2 text-foreground-muted">
                  <DoorOpen size={16} aria-hidden />
                  <h2 className="text-sm font-semibold uppercase tracking-wider">{room.name}</h2>
                  <span className="text-xs text-foreground-faint">
                    ({group.length} item{group.length === 1 ? '' : 's'})
                  </span>
                </header>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {group.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => setDetailItem(item)}
                        className="group flex w-full items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 text-left transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-hover"
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-muted text-foreground transition-colors group-hover:bg-brand/10 group-hover:text-brand">
                          <Sparkles size={15} aria-hidden />
                        </span>
                        <span className="flex flex-1 flex-col">
                          <span className="text-sm font-medium text-foreground">{item.name}</span>
                          <span className="text-xs text-foreground-muted">{room.name}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      <ItemDetailDialog
        item={detailItem}
        rooms={rooms}
        open={detailItem !== null}
        onOpenChange={(o) => (o ? null : setDetailItem(null))}
      />
    </div>
  );
}
