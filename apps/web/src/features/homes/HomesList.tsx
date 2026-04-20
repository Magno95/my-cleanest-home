import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { z } from 'zod';
import { Home as HomeIcon, Plus } from 'lucide-react';
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
import { useHomes, type HomeSummary } from './use-homes.js';
import { useCreateHome } from './use-create-home.js';

const createHomeSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120, 'Must be at most 120 characters'),
});

type CreateHomeValues = z.infer<typeof createHomeSchema>;

export function HomesList() {
  const { data: homes, isLoading, isError, error } = useHomes();
  const [showCreate, setShowCreate] = useState(false);

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Spinner size={28} label="Loading homes" />
      </div>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Something went wrong</CardTitle>
          <CardDescription>
            {error instanceof Error ? error.message : 'Unable to load your homes.'}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const items = homes ?? [];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tighter text-foreground">Your homes</h1>
          <p className="text-sm text-foreground-muted">
            Pick a home to manage its rooms, or create a new one.
          </p>
        </div>
        {!showCreate ? (
          <Button variant="brand" onClick={() => setShowCreate(true)}>
            <Plus size={18} aria-hidden />
            New home
          </Button>
        ) : null}
      </header>

      {showCreate ? <CreateHomeForm onDone={() => setShowCreate(false)} /> : null}

      {items.length === 0 && !showCreate ? (
        <EmptyState onCreate={() => setShowCreate(true)} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {items.map((home) => (
            <li key={home.id}>
              <HomeCard home={home} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function HomeCard({ home }: { home: HomeSummary }) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-muted text-foreground">
          <HomeIcon size={18} aria-hidden />
        </div>
        <CardTitle>{home.name}</CardTitle>
        <CardDescription>Added {format(new Date(home.createdAt), 'MMM d, yyyy')}</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Home detail routes arrive in the next slice. */}
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
          <HomeIcon size={22} aria-hidden />
        </div>
        <div className="flex flex-col gap-1">
          <CardTitle>No homes yet</CardTitle>
          <CardDescription>
            Create your first home to start tracking rooms and tasks.
          </CardDescription>
        </div>
        <Button variant="brand" onClick={onCreate}>
          <Plus size={18} aria-hidden />
          Create your first home
        </Button>
      </CardContent>
    </Card>
  );
}

function CreateHomeForm({ onDone }: { onDone: () => void }) {
  const createHome = useCreateHome();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateHomeValues>({
    resolver: zodResolver(createHomeSchema),
    defaultValues: { name: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await createHome.mutateAsync(values);
      toast.success(`"${values.name}" created`);
      reset();
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create home');
    }
  });

  const busy = createHome.isPending || isSubmitting;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create a new home</CardTitle>
        <CardDescription>You&apos;ll be set as the owner automatically.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
          <Field id="home-name" label="Name" error={errors.name?.message}>
            <Input
              id="home-name"
              placeholder="e.g. Via Roma 12"
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
              {busy ? 'Creating…' : 'Create home'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
