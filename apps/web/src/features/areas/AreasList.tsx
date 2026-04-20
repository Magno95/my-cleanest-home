import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { z } from 'zod';
import { LayoutGrid, Plus } from 'lucide-react';
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
import { useAreas, type AreaSummary } from './use-areas.js';
import { useCreateArea } from './use-create-area.js';

const createAreaSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120, 'Must be at most 120 characters'),
});

type CreateAreaValues = z.infer<typeof createAreaSchema>;

export function AreasList({ roomId }: { roomId: string }) {
  const { data: areas, isLoading, isError, error } = useAreas(roomId);
  const [showCreate, setShowCreate] = useState(false);

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Spinner size={28} label="Loading areas" />
      </div>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Something went wrong</CardTitle>
          <CardDescription>
            {error instanceof Error ? error.message : 'Unable to load areas.'}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const items = areas ?? [];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Areas</h2>
          <p className="text-sm text-foreground-muted">
            Group items inside this room (e.g. &ldquo;Sink&rdquo;, &ldquo;Stovetop&rdquo;).
          </p>
        </div>
        {!showCreate ? (
          <Button variant="brand" onClick={() => setShowCreate(true)}>
            <Plus size={18} aria-hidden />
            New area
          </Button>
        ) : null}
      </header>

      {showCreate ? <CreateAreaForm roomId={roomId} onDone={() => setShowCreate(false)} /> : null}

      {items.length === 0 && !showCreate ? (
        <EmptyState onCreate={() => setShowCreate(true)} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {items.map((area) => (
            <li key={area.id}>
              <AreaCard area={area} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AreaCard({ area }: { area: AreaSummary }) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-muted text-foreground">
          <LayoutGrid size={18} aria-hidden />
        </div>
        <CardTitle>{area.name}</CardTitle>
        <CardDescription>Added {format(new Date(area.createdAt), 'MMM d, yyyy')}</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Area detail (items) arrives in the next slice. */}
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
          <LayoutGrid size={22} aria-hidden />
        </div>
        <div className="flex flex-col gap-1">
          <CardTitle>No areas yet</CardTitle>
          <CardDescription>
            Split this room into smaller areas so you can track items and cleaning tasks.
          </CardDescription>
        </div>
        <Button variant="brand" onClick={onCreate}>
          <Plus size={18} aria-hidden />
          Create your first area
        </Button>
      </CardContent>
    </Card>
  );
}

function CreateAreaForm({ roomId, onDone }: { roomId: string; onDone: () => void }) {
  const createArea = useCreateArea(roomId);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateAreaValues>({
    resolver: zodResolver(createAreaSchema),
    defaultValues: { name: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await createArea.mutateAsync(values);
      toast.success(`"${values.name}" created`);
      reset();
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create area');
    }
  });

  const busy = createArea.isPending || isSubmitting;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create a new area</CardTitle>
        <CardDescription>Areas sit inside a room and hold the items you clean.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
          <Field id="area-name" label="Name" error={errors.name?.message}>
            <Input
              id="area-name"
              placeholder="e.g. Sink"
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
              {busy ? 'Creating…' : 'Create area'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
