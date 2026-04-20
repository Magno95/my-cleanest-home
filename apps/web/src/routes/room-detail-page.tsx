import { Link, useParams } from '@tanstack/react-router';
import { Button, Card, CardDescription, CardHeader, CardTitle, Spinner } from '@mch/ui';
import { Breadcrumbs } from '../components/breadcrumbs.js';
import { useHome } from '../features/homes/use-home.js';
import { useRoom } from '../features/rooms/use-room.js';
import { AreasList } from '../features/areas/AreasList.js';

export function RoomDetailPage() {
  const { homeId, roomId } = useParams({ from: '/_auth/homes/$homeId/rooms/$roomId' });
  const homeQuery = useHome(homeId);
  const roomQuery = useRoom(roomId);

  const isLoading = homeQuery.isLoading || roomQuery.isLoading;
  const isError = homeQuery.isError || roomQuery.isError;
  const error = homeQuery.error ?? roomQuery.error;
  const home = homeQuery.data;
  const room = roomQuery.data;

  // Guard against a room that belongs to a different home than the URL claims.
  const mismatch = room && home ? room.homeId !== home.id : false;

  return (
    <div className="flex flex-col gap-8">
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
              Manage the areas, items and cleaning tasks inside this room.
            </p>
          </header>

          <AreasList roomId={room.id} />
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
    </div>
  );
}
