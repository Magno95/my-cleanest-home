import { useMemo, useState } from 'react';
import { addMinutes, addWeeks, format, startOfWeek, subWeeks } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Card, CardDescription, CardHeader, CardTitle, Spinner } from '@mch/ui';
import { FloatingSearch } from '../components/floating-search.js';
import { NoActiveHomeCard } from '../components/no-active-home-card.js';
import { MiniCalendar } from '../components/calendar/mini-calendar.js';
import { WeeklyGrid, type CalendarTask } from '../components/calendar/weekly-grid.js';
import { useActiveHome } from '../features/active-home/use-active-home.js';
import { useItems, type ItemSummary } from '../features/items/use-items.js';
import { useRooms } from '../features/rooms/use-rooms.js';
import { ItemDetailDialog } from '../features/items/ItemDetailDialog.js';
import { LibraryPanel } from '../features/library/LibraryPanel.js';
import { useMarkItemClean } from '../features/items/use-mark-item-clean.js';
import { useScheduledTasks } from '../features/tasks/use-scheduled-tasks.js';
import { getTaskPaletteIndex } from '../features/tasks/mock-tasks.js';
import { useUpdateTaskSchedule } from '../features/tasks/use-update-task-schedule.js';

/**
 * Primary landing page after sign-in: floating search on top, weekly
 * calendar below. Tasks are now backed by real cleaning_cycles/tasks rows.
 */
export function HomeDashboardPage() {
  const { home, isLoading: activeLoading } = useActiveHome();
  const itemsQuery = useItems(home?.id);
  const roomsQuery = useRooms(home?.id ?? '');

  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [detailItem, setDetailItem] = useState<ItemSummary | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const markItemClean = useMarkItemClean();
  const updateTaskSchedule = useUpdateTaskSchedule();

  const weekStart = useMemo(() => startOfWeek(selectedDate, { weekStartsOn: 1 }), [selectedDate]);
  const items = itemsQuery.data ?? [];
  const rooms = roomsQuery.data ?? [];
  const scheduledTasksQuery = useScheduledTasks(
    home?.id,
    selectedDate,
    items.map((currentItem) => currentItem.id),
  );

  const tasks = useMemo<CalendarTask[]>(() => {
    if (!scheduledTasksQuery.data) return [];

    const itemsById = new Map(items.map((currentItem) => [currentItem.id, currentItem] as const));
    const roomsById = new Map(rooms.map((currentRoom) => [currentRoom.id, currentRoom] as const));
    const roomColorIndex = new Map(
      rooms.map(
        (currentRoom, index) =>
          [currentRoom.id, getTaskPaletteIndex(currentRoom.colorKey, index)] as const,
      ),
    );

    return scheduledTasksQuery.data.flatMap((task) => {
      const currentItem = itemsById.get(task.itemId);
      if (!currentItem) return [];

      const roomForItem = currentItem.roomId ? (roomsById.get(currentItem.roomId) ?? null) : null;
      const start = new Date(task.dueAt);

      return [
        {
          id: task.id,
          itemId: currentItem.id,
          itemName: currentItem.name,
          roomName: roomForItem?.name ?? null,
          start,
          end: addMinutes(start, 45),
          colorIndex: currentItem.roomId ? (roomColorIndex.get(currentItem.roomId) ?? 0) : 0,
          status: task.status,
          completedAt: task.completedAt,
        },
      ];
    });
  }, [items, rooms, scheduledTasksQuery.data]);

  const pendingCount = tasks.filter((task) => task.status === 'pending').length;
  const doneCount = tasks.filter((task) => task.status === 'done').length;

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

  return (
    <div className="flex flex-col gap-8">
      {/* Floating search, centered */}
      <div className="flex justify-center">
        <FloatingSearch items={items} rooms={rooms} onSelect={setDetailItem} />
      </div>

      {/* Dashboard grid */}
      <div className="grid gap-6 min-[1200px]:grid-cols-[280px_1fr]">
        <aside className="hidden flex-col gap-4 min-[1200px]:flex">
          <MiniCalendar selectedDate={selectedDate} onSelect={setSelectedDate} />

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base">{home.name}</CardTitle>
              <CardDescription>
                {items.length} item{items.length === 1 ? '' : 's'} · {rooms.length} room
                {rooms.length === 1 ? '' : 's'}
              </CardDescription>
            </CardHeader>
          </Card>

          <Button variant="brand" className="w-full" onClick={() => setLibraryOpen(true)}>
            <Plus size={16} aria-hidden />
            New cleaning item
          </Button>
        </aside>

        <section className="flex flex-col gap-4">
          <header className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tighter text-foreground">
                {format(weekStart, 'MMMM d, yyyy')}
              </h1>
              <p className="text-sm text-foreground-muted">
                {pendingCount} pending · {doneCount} done this week
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Previous week"
                onClick={() => setSelectedDate((d) => subWeeks(d, 1))}
              >
                <ChevronLeft size={18} aria-hidden />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date())}>
                Today
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Next week"
                onClick={() => setSelectedDate((d) => addWeeks(d, 1))}
              >
                <ChevronRight size={18} aria-hidden />
              </Button>
            </div>
          </header>

          {itemsQuery.isLoading || roomsQuery.isLoading || scheduledTasksQuery.isLoading ? (
            <div className="flex h-96 items-center justify-center">
              <Spinner size={28} label="Loading tasks" />
            </div>
          ) : (
            <WeeklyGrid
              weekAnchor={selectedDate}
              completingTaskId={markItemClean.isPending ? completingTaskId : null}
              tasks={tasks}
              movingTaskId={
                updateTaskSchedule.isPending ? (updateTaskSchedule.variables?.taskId ?? null) : null
              }
              onTaskClick={(t) => {
                const item = items.find((i) => i.id === t.itemId) ?? null;
                setDetailItem(item);
              }}
              onTaskDone={(task) => {
                if (!home) return;

                setCompletingTaskId(task.id);

                void markItemClean
                  .mutateAsync({
                    itemId: task.itemId,
                    homeId: home.id,
                  })
                  .catch((error) => {
                    toast.error(error instanceof Error ? error.message : 'Failed to complete task');
                  })
                  .finally(() => {
                    setCompletingTaskId((current) => (current === task.id ? null : current));
                  });
              }}
              onTaskMove={(task, nextStart) => {
                if (!home) return;
                void updateTaskSchedule
                  .mutateAsync({
                    taskId: task.id,
                    itemId: task.itemId,
                    homeId: home.id,
                    dueAt: nextStart.toISOString(),
                  })
                  .catch((error) => {
                    toast.error(error instanceof Error ? error.message : 'Failed to move task');
                  });
              }}
            />
          )}
        </section>
      </div>

      <ItemDetailDialog
        item={detailItem}
        rooms={rooms}
        open={detailItem !== null}
        onOpenChange={(o) => (o ? null : setDetailItem(null))}
      />

      <LibraryPanel home={home} open={libraryOpen} onOpenChange={setLibraryOpen} />

      {/* Floating FAB for tablet / small screens */}
      <Button
        variant="brand"
        size="lg"
        onClick={() => setLibraryOpen(true)}
        aria-label="New cleaning item"
        className="fixed bottom-6 right-6 z-30 rounded-full shadow-hover min-[1200px]:hidden"
      >
        <Plus size={18} aria-hidden />
        New cleaning item
      </Button>
    </div>
  );
}
