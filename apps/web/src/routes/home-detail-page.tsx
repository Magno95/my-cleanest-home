import { Link, useParams } from '@tanstack/react-router';
import { ChevronLeft } from 'lucide-react';
import { Button, Card, CardDescription, CardHeader, CardTitle, Spinner } from '@mch/ui';
import { useHome } from '../features/homes/use-home.js';
import { RoomsList } from '../features/rooms/RoomsList.js';

export function HomeDetailPage() {
  const { homeId } = useParams({ from: '/_auth/homes/$homeId' });
  const { data: home, isLoading, isError, error } = useHome(homeId);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-foreground-muted underline-offset-4 hover:text-foreground hover:underline"
        >
          <ChevronLeft size={16} aria-hidden />
          All homes
        </Link>
      </div>

      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <Spinner size={28} label="Loading home" />
        </div>
      ) : isError || !home ? (
        <Card>
          <CardHeader>
            <CardTitle>Home not found</CardTitle>
            <CardDescription>
              {error instanceof Error ? error.message : 'This home no longer exists.'}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <header className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold tracking-tighter text-foreground">{home.name}</h1>
            <p className="text-sm text-foreground-muted">
              Manage the rooms, areas and cleaning tasks for this home.
            </p>
          </header>

          <RoomsList homeId={home.id} />
        </>
      )}

      {/* Back button for error state */}
      {isError ? (
        <div>
          <Button asChild variant="outline">
            <Link to="/">Back to homes</Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
