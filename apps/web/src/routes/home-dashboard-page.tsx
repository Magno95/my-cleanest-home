import { useMemo, useState } from 'react';
import { addWeeks, format, startOfWeek, subWeeks } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button, Card, CardDescription, CardHeader, CardTitle, Spinner } from '@mch/ui';
import { FloatingSearch } from '../components/floating-search.js';
import { MiniCalendar } from '../components/calendar/mini-calendar.js';
import { WeeklyGrid } from '../components/calendar/weekly-grid.js';
import { useActiveHome } from '../features/active-home/use-active-home.js';
import { useItems, type ItemSummary } from '../features/items/use-items.js';
import { useRooms } from '../features/rooms/use-rooms.js';
import { ItemDetailDialog } from '../features/items/ItemDetailDialog.js';
import { LibraryPanel } from '../features/library/LibraryPanel.js';
import { generateMockTasks } from '../features/tasks/mock-tasks.js';

/**
 * Primary landing page after sign-in: floating search on top, weekly
 * calendar below. Data comes from the user's active home; tasks are still
 * derived from mock generators until cleaning_cycles are wired.
 */
export function HomeDashboardPage() {
  const { home, isLoading: activeLoading } = useActiveHome();
  const itemsQuery = useItems(home?.id);
  const roomsQuery = useRooms(home?.id ?? '');

  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [detailItem, setDetailItem] = useState<ItemSummary | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);

  const weekStart = useMemo(() => startOfWeek(selectedDate, { weekStartsOn: 1 }), [selectedDate]);

  const tasks = useMemo(() => {
    if (!itemsQuery.data || !roomsQuery.data) return [];
    return generateMockTasks(itemsQuery.data, roomsQuery.data, selectedDate);
  }, [itemsQuery.data, roomsQuery.data, selectedDate]);

  if (activeLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Spinner size={28} label="Loading" />
      </div>
    );
  }

  if (!home) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No active home</CardTitle>
          <CardDescription>
            Open your profile and create a home to start scheduling cleaning tasks.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const items = itemsQuery.data ?? [];
  const rooms = roomsQuery.data ?? [];

  return (
    <div className="flex flex-col gap-8">
      {/* Floating search, centered */}
      <div className="flex justify-center">
        <FloatingSearch items={items} rooms={rooms} onSelect={setDetailItem} />
      </div>

      {/* Dashboard grid */}
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="flex flex-col gap-4">
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
                {tasks.length} task{tasks.length === 1 ? '' : 's'} this week
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

          {itemsQuery.isLoading || roomsQuery.isLoading ? (
            <div className="flex h-96 items-center justify-center">
              <Spinner size={28} label="Loading tasks" />
            </div>
          ) : (
            <WeeklyGrid
              weekAnchor={selectedDate}
              tasks={tasks}
              onTaskClick={(t) => {
                const item = items.find((i) => i.id === t.itemId) ?? null;
                setDetailItem(item);
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
    </div>
  );
}
