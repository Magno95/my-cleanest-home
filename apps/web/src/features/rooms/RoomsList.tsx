import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { z } from 'zod';
import { DoorOpen, Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Spinner,
} from '@mch/ui';
import { Field } from '../../components/field.js';
import { useRooms, type RoomSummary } from './use-rooms.js';
import { useCreateRoom } from './use-create-room.js';

const createRoomSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120, 'Must be at most 120 characters'),
});

type CreateRoomValues = z.infer<typeof createRoomSchema>;

export function RoomsList({ homeId }: { homeId: string }) {
  const { data: rooms, isLoading, isError, error } = useRooms(homeId);
  const [showCreate, setShowCreate] = useState(false);

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Spinner size={28} label="Loading rooms" />
      </div>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Something went wrong</CardTitle>
          <CardDescription>
            {error instanceof Error ? error.message : 'Unable to load rooms.'}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const items = rooms ?? [];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Rooms</h2>
          <p className="text-sm text-foreground-muted">
            Add a room to start organising areas and tasks inside it.
          </p>
        </div>
        {!showCreate ? (
          <Button variant="brand" onClick={() => setShowCreate(true)}>
            <Plus size={18} aria-hidden />
            New room
          </Button>
        ) : null}
      </header>

      {showCreate ? <CreateRoomForm homeId={homeId} onDone={() => setShowCreate(false)} /> : null}

      {items.length === 0 && !showCreate ? (
        <EmptyState onCreate={() => setShowCreate(true)} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {items.map((room) => (
            <li key={room.id}>
              <RoomCard room={room} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RoomCard({ room }: { room: RoomSummary }) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-muted text-foreground">
          <DoorOpen size={18} aria-hidden />
        </div>
        <CardTitle>{room.name}</CardTitle>
        <CardDescription>Added {format(new Date(room.createdAt), 'MMM d, yyyy')}</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Room detail (areas) arrives in the next slice. */}
        <Button variant="outline" disabled>
          Open
        </Button>
      </CardContent>
    </Card>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <Card className="border border-dashed border-border-strong shadow-none">
      <CardContent className="items-center gap-4 py-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-muted text-foreground">
          <DoorOpen size={22} aria-hidden />
        </div>
        <div className="flex flex-col gap-1">
          <CardTitle>No rooms yet</CardTitle>
          <CardDescription>
            Add your first room to start tracking areas and cleaning tasks.
          </CardDescription>
        </div>
        <Button variant="brand" onClick={onCreate}>
          <Plus size={18} aria-hidden />
          Create your first room
        </Button>
      </CardContent>
    </Card>
  );
}

function CreateRoomForm({ homeId, onDone }: { homeId: string; onDone: () => void }) {
  const createRoom = useCreateRoom(homeId);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateRoomValues>({
    resolver: zodResolver(createRoomSchema),
    defaultValues: { name: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await createRoom.mutateAsync(values);
      toast.success(`"${values.name}" created`);
      reset();
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create room');
    }
  });

  const busy = createRoom.isPending || isSubmitting;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create a new room</CardTitle>
        <CardDescription>Rooms group areas and cleaning tasks inside a home.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
          <Field id="room-name" label="Name" error={errors.name?.message}>
            <Input
              id="room-name"
              placeholder="e.g. Kitchen"
              autoFocus
              aria-invalid={errors.name ? 'true' : 'false'}
              {...register('name')}
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onDone} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" variant="brand" disabled={busy}>
              {busy ? 'Creating…' : 'Create room'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
