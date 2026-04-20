import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { z } from 'zod';
import { Check, Home as HomeIcon, Plus } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { toast } from 'sonner';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  cn,
  Input,
  Spinner,
} from '@mch/ui';
import { Field } from '../components/field.js';
import { useAuth } from '../lib/auth.js';
import { useHomes, type HomeSummary } from '../features/homes/use-homes.js';
import { useCreateHome } from '../features/homes/use-create-home.js';
import { useJoinHomeByCode } from '../features/homes/use-join-home-by-code.js';
import { useActiveHome } from '../features/active-home/use-active-home.js';
import { useSetActiveHome } from '../features/profile/use-set-active-home.js';
import { HomeCodeDisplay } from '../features/homes/home-code-display.js';

const createHomeSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120, 'Must be at most 120 characters'),
});
type CreateHomeValues = z.infer<typeof createHomeSchema>;

const joinHomeSchema = z.object({
  code: z.string().trim().min(1, 'Home code is required'),
});
type JoinHomeValues = z.infer<typeof joinHomeSchema>;

/**
 * Account + multi-home management. The currently active home is highlighted;
 * clicking another home switches it via user_profiles.active_home_id.
 */
export function ProfilePage() {
  const { user } = useAuth();
  const { home: activeHome } = useActiveHome();
  const { data: homes, isLoading, isError, error } = useHomes();
  const [showCreate, setShowCreate] = useState(false);
  const [panelMode, setPanelMode] = useState<'create' | 'join'>('create');

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tighter text-foreground">Profile</h1>
        <p className="text-sm text-foreground-muted">
          Signed in as <span className="text-foreground">{user?.email}</span>. Manage your homes
          below. Room colors and demo tools now live in Settings.
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <header className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">Your homes</h2>
            <p className="text-sm text-foreground-muted">
              The active home determines what you see on the dashboard.
            </p>
          </div>
          {!showCreate ? (
            <Button variant="brand" onClick={() => setShowCreate(true)}>
              <Plus size={18} aria-hidden />
              New home
            </Button>
          ) : null}
        </header>

        {showCreate ? (
          <Card>
            <CardHeader>
              <CardTitle>Add a home</CardTitle>
              <CardDescription>Create a new home or join one with a code.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={panelMode === 'create' ? 'brand' : 'outline'}
                  onClick={() => setPanelMode('create')}
                >
                  Create new
                </Button>
                <Button
                  type="button"
                  variant={panelMode === 'join' ? 'brand' : 'outline'}
                  onClick={() => setPanelMode('join')}
                >
                  Join with code
                </Button>
              </div>
              {panelMode === 'create' ? (
                <CreateHomeForm onDone={() => setShowCreate(false)} />
              ) : (
                <JoinHomeForm onDone={() => setShowCreate(false)} />
              )}
            </CardContent>
          </Card>
        ) : null}

        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Spinner size={24} label="Loading homes" />
          </div>
        ) : isError ? (
          <Card>
            <CardHeader>
              <CardTitle>Something went wrong</CardTitle>
              <CardDescription>
                {error instanceof Error ? error.message : 'Unable to load homes.'}
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (homes?.length ?? 0) === 0 ? (
          <Card className="border border-dashed border-border-strong shadow-none">
            <CardContent className="items-center gap-4 py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-muted text-foreground">
                <HomeIcon size={22} aria-hidden />
              </div>
              <div className="flex flex-col gap-1">
                <CardTitle>No homes yet</CardTitle>
                <CardDescription>Create one to start tracking cleaning tasks.</CardDescription>
              </div>
              <Button variant="brand" onClick={() => setShowCreate(true)}>
                <Plus size={18} aria-hidden />
                Create your first home
              </Button>
            </CardContent>
          </Card>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {homes!.map((home) => (
              <li key={home.id}>
                <HomeRow home={home} isActive={home.id === activeHome?.id} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function HomeRow({ home, isActive }: { home: HomeSummary; isActive: boolean }) {
  const setActive = useSetActiveHome();

  const handleSwitch = async () => {
    try {
      await setActive.mutateAsync(home.id);
      toast.success(`Switched to "${home.name}"`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to switch home');
    }
  };

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(home.joinCode);
    toast.success('Home code copied');
  };

  return (
    <Card
      className={cn(
        'flex h-full flex-col transition-shadow hover:shadow-hover',
        isActive && 'border-brand/40 bg-brand/5',
      )}
    >
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-muted text-foreground">
            <HomeIcon size={18} aria-hidden />
          </div>
          {isActive ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand px-2.5 py-0.5 text-xs font-semibold text-brand-foreground">
              <Check size={12} aria-hidden />
              Active
            </span>
          ) : null}
        </div>
        <CardTitle>{home.name}</CardTitle>
        <CardDescription>Added {format(new Date(home.createdAt), 'MMM d, yyyy')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <HomeCodeDisplay code={home.joinCode} onCopy={() => void handleCopyCode()} />
        <div className="flex flex-row gap-2">
          {!isActive ? (
            <Button variant="brand" size="sm" onClick={handleSwitch} disabled={setActive.isPending}>
              {setActive.isPending ? 'Switching…' : 'Switch to this home'}
            </Button>
          ) : (
            <Button asChild variant="outline" size="sm">
              <Link to="/">Open dashboard</Link>
            </Button>
          )}
          <Button asChild variant="ghost" size="sm">
            <Link to="/homes/$homeId" params={{ homeId: home.id }}>
              Manage rooms
            </Link>
          </Button>
        </div>
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
    <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
      <Field id="home-name-profile" label="Name" error={errors.name?.message}>
        <Input
          id="home-name-profile"
          placeholder="e.g. Apartment, Parents' house"
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
  );
}

function JoinHomeForm({ onDone }: { onDone: () => void }) {
  const joinHome = useJoinHomeByCode();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<JoinHomeValues>({
    resolver: zodResolver(joinHomeSchema),
    defaultValues: { code: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await joinHome.mutateAsync(values);
      toast.success('Joined home successfully');
      reset();
      onDone();
    } catch (err) {
      const message =
        err instanceof Error && err.message.includes('Home code not found')
          ? 'Home code not found'
          : 'Failed to join home';
      toast.error(message);
    }
  });

  const busy = joinHome.isPending || isSubmitting;

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
      <Field id="home-code-profile" label="Home code" error={errors.code?.message}>
        <Input
          id="home-code-profile"
          placeholder="e.g. MCH-7K4P9Q"
          autoFocus
          aria-invalid={errors.code ? 'true' : 'false'}
          {...register('code')}
        />
      </Field>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" variant="brand" disabled={busy}>
          {busy ? 'Joining…' : 'Join home'}
        </Button>
      </div>
    </form>
  );
}
