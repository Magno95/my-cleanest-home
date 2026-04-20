import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { DoorOpen, RotateCcw, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Spinner,
  cn,
} from '@mch/ui';
import { NoActiveHomeCard } from '../components/no-active-home-card.js';
import { useActiveHome } from '../features/active-home/use-active-home.js';
import { useResetDemoData } from '../features/bootstrap/use-reset-demo-data.js';
import { ReferenceDataManager } from '../features/reference-data/reference-data-manager.js';
import { useRooms } from '../features/rooms/use-rooms.js';
import { useUpdateRoomColor } from '../features/rooms/use-update-room-color.js';
import {
  TASK_PALETTE,
  getTaskPaletteIndex,
  type TaskPaletteKey,
} from '../features/tasks/mock-tasks.js';

export function SettingsPage() {
  const { home, isLoading: activeLoading } = useActiveHome();
  const roomsQuery = useRooms(home?.id);
  const updateRoomColor = useUpdateRoomColor(home?.id ?? '');
  const resetDemo = useResetDemoData();
  const [savingRoomId, setSavingRoomId] = useState<string | null>(null);

  const handleResetDemoData = async () => {
    const confirmed = window.confirm(
      'This will replace rooms, items, cycles and pending tasks in your active home with demo data. Continue?',
    );
    if (!confirmed) return;

    try {
      await resetDemo.mutateAsync();
      toast.success('Demo data regenerated.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to regenerate demo data');
    }
  };

  const handleColorChange = async (roomId: string, colorKey: TaskPaletteKey | null) => {
    if (!home) return;

    setSavingRoomId(roomId);
    try {
      await updateRoomColor.mutateAsync({ roomId, colorKey });
      toast.success('Room color updated.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update room color');
    } finally {
      setSavingRoomId((current) => (current === roomId ? null : current));
    }
  };

  if (activeLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Spinner size={28} label="Loading settings" />
      </div>
    );
  }

  if (!home) {
    return <NoActiveHomeCard />;
  }

  const rooms = roomsQuery.data ?? [];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tighter text-foreground">
          <Settings2 size={22} aria-hidden />
          Settings
        </h1>
        <p className="text-sm text-foreground-muted">
          Manage room task colors, reusable cleaning products and tools, and demo utilities for{' '}
          <span className="text-foreground">{home.name}</span>.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Room colors</CardTitle>
          <CardDescription>
            All tasks in same room now share same color. Change palette per room here.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {roomsQuery.isLoading ? (
            <div className="flex h-28 items-center justify-center">
              <Spinner size={24} label="Loading rooms" />
            </div>
          ) : rooms.length === 0 ? (
            <Card className="border border-dashed border-border-strong shadow-none">
              <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
                <DoorOpen size={22} aria-hidden className="text-foreground-muted" />
                <div className="flex flex-col gap-1">
                  <CardTitle className="text-base">No rooms yet</CardTitle>
                  <CardDescription>Create room first, then choose its task color.</CardDescription>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link to="/profile">Go to profile</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <ul className="grid gap-4">
              {rooms.map((room, index) => {
                const previewIndex = getTaskPaletteIndex(room.colorKey, index);
                const preview = TASK_PALETTE[previewIndex]!;
                const isSaving = savingRoomId === room.id && updateRoomColor.isPending;

                return (
                  <li key={room.id}>
                    <Card>
                      <CardContent className="flex flex-col gap-4 py-5">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'flex h-11 w-11 items-center justify-center rounded-xl border border-black/5',
                              preview.bg,
                              preview.text,
                            )}
                          >
                            <DoorOpen size={18} aria-hidden />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-foreground">
                              {room.name}
                            </span>
                            <span className="text-xs text-foreground-muted">
                              {room.colorKey
                                ? `Custom: ${preview.label}`
                                : `Auto: ${preview.label}`}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => void handleColorChange(room.id, null)}
                            className={cn(
                              'rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] transition',
                              room.colorKey === null
                                ? 'border-foreground bg-foreground text-background'
                                : 'border-border bg-background text-foreground-muted hover:border-foreground/30 hover:text-foreground',
                            )}
                          >
                            Auto
                          </button>

                          {TASK_PALETTE.map((option) => (
                            <button
                              key={option.id}
                              type="button"
                              disabled={isSaving}
                              onClick={() => void handleColorChange(room.id, option.id)}
                              className={cn(
                                'flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] transition',
                                option.bg,
                                option.text,
                                room.colorKey === option.id
                                  ? 'border-foreground shadow-sm'
                                  : 'border-transparent hover:border-foreground/20',
                              )}
                            >
                              <span className={cn('h-2.5 w-2.5 rounded-full', option.stripe)} />
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <ReferenceDataManager />

      <Card className="border-brand/20 bg-brand/5">
        <CardHeader>
          <CardTitle className="text-base">Testing utilities</CardTitle>
          <CardDescription>
            Rebuild demo rooms, items, photos and scheduled tasks in{' '}
            <span className="text-foreground">{home.name}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-foreground-muted">
            Useful after experiments when you want clean mock data again.
          </p>
          <Button
            variant="destructive"
            onClick={handleResetDemoData}
            disabled={resetDemo.isPending}
          >
            <RotateCcw size={16} aria-hidden />
            {resetDemo.isPending ? 'Resetting…' : 'Reset demo data'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
