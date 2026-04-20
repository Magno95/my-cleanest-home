import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DoorOpen, Plus, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import {
  Button,
  cn,
  Input,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Spinner,
} from '@mch/ui';
import { Field } from '../../components/field.js';
import type { HomeSummary } from '../homes/use-homes.js';
import { useRooms, type RoomSummary } from '../rooms/use-rooms.js';
import { useCreateRoom } from '../rooms/use-create-room.js';
import { MISCELLANEOUS_ROOM_NAME } from '../rooms/miscellaneous-room.js';
import { useItems, type ItemSummary } from '../items/use-items.js';
import { useCreateItem } from '../items/use-create-item.js';

interface LibraryPanelProps {
  home: HomeSummary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Side drawer that manages the active home's library: rooms on top, then
 * items. "New cleaning item" sits above the lists as the prominent CTA so
 * users don't have to scroll to add one.
 */
export function LibraryPanel({ home, open, onOpenChange }: LibraryPanelProps) {
  const roomsQuery = useRooms(home.id);
  const itemsQuery = useItems(home.id);

  const [mode, setMode] = useState<'idle' | 'createItem' | 'createRoom'>('idle');

  const rooms = roomsQuery.data ?? [];
  const items = itemsQuery.data;
  const miscellaneousRoom = useMemo(
    () => rooms.find((room) => room.name === MISCELLANEOUS_ROOM_NAME) ?? null,
    [rooms],
  );

  const itemsByRoom = useMemo(() => {
    const map = new Map<string | null, ItemSummary[]>();
    for (const it of items ?? []) {
      const key = it.roomId ?? miscellaneousRoom?.id ?? null;
      const bucket = map.get(key) ?? [];
      bucket.push(it);
      map.set(key, bucket);
    }
    return map;
  }, [items, miscellaneousRoom?.id]);

  const itemCount = items?.length ?? 0;

  const loading = roomsQuery.isLoading || itemsQuery.isLoading;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="max-w-xl gap-0 overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Library</SheetTitle>
          <SheetDescription>Rooms and cleaning items for {home.name}.</SheetDescription>
        </SheetHeader>

        {/* Prominent CTA */}
        <div className="mt-4 rounded-xl border border-brand/20 bg-brand/5 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-foreground">Add a cleaning item</p>
              <p className="text-xs text-foreground-muted">
                Defaults to this home. Assign it to a room if you want.
              </p>
            </div>
            <Button
              variant="brand"
              size="sm"
              onClick={() => setMode(mode === 'createItem' ? 'idle' : 'createItem')}
            >
              <Plus size={16} aria-hidden />
              {mode === 'createItem' ? 'Cancel' : 'New item'}
            </Button>
          </div>
          {mode === 'createItem' ? (
            <CreateItemForm home={home} rooms={rooms} onDone={() => setMode('idle')} />
          ) : null}
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center py-10">
            <Spinner size={24} label="Loading library" />
          </div>
        ) : (
          <>
            {/* Items grouped by room */}
            <section className="mt-6 flex flex-col gap-2">
              <header className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground-faint">
                  Items ({itemCount})
                </h3>
              </header>
              {itemCount === 0 ? (
                <p className="text-sm text-foreground-muted">
                  No items yet. Use the button above to add your first.
                </p>
              ) : (
                <div className="flex flex-col gap-4">
                  {rooms.map((room) => {
                    const key = room.id;
                    const group = itemsByRoom.get(key) ?? [];
                    if (group.length === 0) return null;
                    return (
                      <div key={key} className="flex flex-col gap-1.5">
                        <h4 className="text-xs font-medium text-foreground-muted">{room.name}</h4>
                        <ul className="flex flex-col gap-1">
                          {group.map((item) => (
                            <li
                              key={item.id}
                              className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2"
                            >
                              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-muted text-foreground">
                                <Sparkles size={13} aria-hidden />
                              </span>
                              <span className="flex-1 text-sm text-foreground">{item.name}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Rooms list + create */}
            <section className="mt-6 flex flex-col gap-2">
              <header className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground-faint">
                  Rooms ({rooms.length})
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMode(mode === 'createRoom' ? 'idle' : 'createRoom')}
                >
                  <Plus size={14} aria-hidden />
                  {mode === 'createRoom' ? 'Cancel' : 'New room'}
                </Button>
              </header>

              {mode === 'createRoom' ? (
                <CreateRoomForm homeId={home.id} onDone={() => setMode('idle')} />
              ) : null}

              <ul className="flex flex-col gap-1">
                {rooms.map((room) => {
                  const count = itemsByRoom.get(room.id)?.length ?? 0;
                  return (
                    <li
                      key={room.id}
                      className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2"
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-muted text-foreground">
                        <DoorOpen size={13} aria-hidden />
                      </span>
                      <span className="flex-1 text-sm text-foreground">{room.name}</span>
                      <span className="text-xs text-foreground-muted">
                        {count} item{count === 1 ? '' : 's'}
                      </span>
                    </li>
                  );
                })}
                {rooms.length === 0 ? (
                  <li className="text-sm text-foreground-muted">No rooms yet.</li>
                ) : null}
              </ul>
            </section>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ----------------------------------------------------------------------------
// Forms
// ----------------------------------------------------------------------------

const createItemSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120, 'Must be at most 120 characters'),
  roomId: z.string().optional().nullable(),
  firstCleaningDate: z.string().trim().min(1, 'First cleaning day is required'),
  frequencyValue: z.coerce.number().int().min(1, 'Frequency is required'),
  frequencyUnit: z.enum(['day', 'week', 'month', 'year']),
});
type CreateItemValues = z.infer<typeof createItemSchema>;

function CreateItemForm({
  home,
  rooms,
  onDone,
}: {
  home: HomeSummary;
  rooms: RoomSummary[];
  onDone: () => void;
}) {
  const createItem = useCreateItem(home.id);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateItemValues>({
    resolver: zodResolver(createItemSchema),
    defaultValues: {
      name: '',
      roomId: '',
      firstCleaningDate: new Date().toISOString().slice(0, 10),
      frequencyValue: 1,
      frequencyUnit: 'week',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await createItem.mutateAsync({
        name: values.name,
        roomId: values.roomId ? values.roomId : null,
        firstCleaningDate: new Date(`${values.firstCleaningDate}T12:00:00`).toISOString(),
        frequencyValue: values.frequencyValue,
        frequencyUnit: values.frequencyUnit,
      });
      toast.success(`"${values.name}" added`);
      reset();
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add item');
    }
  });

  const busy = createItem.isPending || isSubmitting;

  return (
    <form className="mt-4 flex flex-col gap-3" onSubmit={onSubmit} noValidate>
      <Field id="item-name" label="Name" error={errors.name?.message}>
        <Input
          id="item-name"
          placeholder="e.g. Fridge door"
          autoFocus
          aria-invalid={errors.name ? 'true' : 'false'}
          {...register('name')}
        />
      </Field>
      <Field id="item-room" label="Room (optional)">
        <select
          id="item-room"
          className={cn(
            'flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}
          {...register('roomId')}
        >
          <option value="">{MISCELLANEOUS_ROOM_NAME}</option>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_112px_132px]">
        <Field
          id="item-first-cleaning-date"
          label="First cleaning day"
          error={errors.firstCleaningDate?.message}
        >
          <Input
            id="item-first-cleaning-date"
            type="date"
            aria-invalid={errors.firstCleaningDate ? 'true' : 'false'}
            {...register('firstCleaningDate')}
          />
        </Field>
        <Field id="item-frequency-value" label="Every" error={errors.frequencyValue?.message}>
          <Input
            id="item-frequency-value"
            type="number"
            min={1}
            aria-invalid={errors.frequencyValue ? 'true' : 'false'}
            {...register('frequencyValue', { valueAsNumber: true })}
          />
        </Field>
        <Field id="item-frequency-unit" label="Unit" error={errors.frequencyUnit?.message}>
          <select
            id="item-frequency-unit"
            className={cn(
              'flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            )}
            {...register('frequencyUnit')}
          >
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
            <option value="year">Year</option>
          </select>
        </Field>
      </div>
      <Button type="submit" variant="brand" disabled={busy}>
        {busy ? 'Adding…' : 'Add item'}
      </Button>
    </form>
  );
}

const createRoomSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120, 'Must be at most 120 characters'),
});
type CreateRoomValues = z.infer<typeof createRoomSchema>;

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
    <form className="flex flex-col gap-2" onSubmit={onSubmit} noValidate>
      <Field id="room-name-panel" label="Name" error={errors.name?.message}>
        <Input
          id="room-name-panel"
          placeholder="e.g. Bathroom"
          autoFocus
          aria-invalid={errors.name ? 'true' : 'false'}
          {...register('name')}
        />
      </Field>
      <Button type="submit" variant="brand" size="sm" disabled={busy}>
        {busy ? 'Creating…' : 'Create room'}
      </Button>
    </form>
  );
}
