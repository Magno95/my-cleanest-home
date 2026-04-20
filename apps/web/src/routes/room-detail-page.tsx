import { useMemo, useState } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import { Sparkles } from 'lucide-react';
import { Button, Card, CardDescription, CardHeader, CardTitle, Spinner } from '@mch/ui';
import { Breadcrumbs } from '../components/breadcrumbs.js';
import { useHome } from '../features/homes/use-home.js';
import { ItemDetailDialog } from '../features/items/ItemDetailDialog.js';
import { useItems, type ItemSummary } from '../features/items/use-items.js';
import { useRoom } from '../features/rooms/use-room.js';
import { useRooms } from '../features/rooms/use-rooms.js';

export function RoomDetailPage() {
  const { homeId, roomId } = useParams({ from: '/_auth/homes/$homeId/rooms/$roomId' });
  const homeQuery = useHome(homeId);
  const roomQuery = useRoom(roomId);
  const itemsQuery = useItems(homeId);
  const roomsQuery = useRooms(homeId);
  const [detailItem, setDetailItem] = useState<ItemSummary | null>(null);

  const isLoading =
    homeQuery.isLoading || roomQuery.isLoading || itemsQuery.isLoading || roomsQuery.isLoading;
  const isError =
    homeQuery.isError || roomQuery.isError || itemsQuery.isError || roomsQuery.isError;
  const error = homeQuery.error ?? roomQuery.error ?? itemsQuery.error ?? roomsQuery.error;
  const home = homeQuery.data;
  const room = roomQuery.data;
  const rooms = roomsQuery.data ?? [];
  const roomItems = useMemo(
    () => (itemsQuery.data ?? []).filter((item) => item.roomId === roomId),
    [itemsQuery.data, roomId],
  );

  // Guard against a room that belongs to a different home than the URL claims.
  const mismatch = room && home ? room.homeId !== home.id : false;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <Breadcrumbs
        items={[
          { label: 'Homes', to: '/' },
          {
            label: home?.name ?? 'Home',
            to: '/homes/$homeId',
            params: { homeId },
          },
          { label: room?.name ?? 'Room' },
        ]}
      />

      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <Spinner size={28} label="Loading room" />
        </div>
      ) : isError || !room || !home || mismatch ? (
        <Card>
          <CardHeader>
            <CardTitle>Room not found</CardTitle>
            <CardDescription>
              {mismatch
                ? 'This room does not belong to the selected home.'
                : error instanceof Error
                  ? error.message
                  : 'This room no longer exists.'}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <header className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold tracking-tighter text-foreground">{room.name}</h1>
            <p className="text-sm text-foreground-muted">
              Manage items and cleaning tasks inside this room.
            </p>
          </header>

          {roomItems.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">No items in this room yet</CardTitle>
                <CardDescription>
                  Create items from dashboard or cleaning items page, then assign them to{' '}
                  {room.name}.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <section className="flex flex-col gap-3">
              <header className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-foreground-muted">
                <Sparkles size={16} aria-hidden />
                {roomItems.length} item{roomItems.length === 1 ? '' : 's'}
              </header>
              <ul className="grid gap-3 sm:grid-cols-2">
                {roomItems.map((item) => (
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
          )}
        </>
      )}

      {isError ? (
        <div>
          <Button asChild variant="outline">
            <Link to="/homes/$homeId" params={{ homeId }}>
              Back to home
            </Link>
          </Button>
        </div>
      ) : null}

      <ItemDetailDialog
        item={detailItem}
        rooms={rooms}
        open={detailItem !== null}
        onOpenChange={(open) => {
          if (!open) setDetailItem(null);
        }}
      />
    </div>
  );
}
