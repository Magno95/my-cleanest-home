import { addDays, format, isSameDay, startOfWeek } from 'date-fns';
import { useMemo } from 'react';
import { cn } from '@mch/ui';
import {
  HOUR_START,
  HOURS_SHOWN,
  TASK_PALETTE,
  type MockTask,
} from '../../features/tasks/mock-tasks.js';

interface WeeklyGridProps {
  weekAnchor: Date;
  tasks: MockTask[];
  onTaskClick: (task: MockTask) => void;
  today?: Date;
}

const ROW_HEIGHT_PX = 56; // each hour row
const DAYS_IN_WEEK = 7;

/**
 * Full-week calendar grid inspired by the reference design. Days across the
 * top, hours down the left; task cards are positioned absolutely per day
 * column using their start/end timestamps.
 */
export function WeeklyGrid({
  weekAnchor,
  tasks,
  onTaskClick,
  today = new Date(),
}: WeeklyGridProps) {
  const weekStart = useMemo(() => startOfWeek(weekAnchor, { weekStartsOn: 1 }), [weekAnchor]);

  const days = useMemo(
    () => Array.from({ length: DAYS_IN_WEEK }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const hours = useMemo(() => Array.from({ length: HOURS_SHOWN }, (_, i) => HOUR_START + i), []);

  const tasksByDay = useMemo(() => {
    const map = new Map<number, MockTask[]>();
    for (let i = 0; i < DAYS_IN_WEEK; i++) map.set(i, []);
    for (const t of tasks) {
      for (let i = 0; i < DAYS_IN_WEEK; i++) {
        if (isSameDay(t.start, days[i]!)) {
          map.get(i)!.push(t);
          break;
        }
      }
    }
    return map;
  }, [tasks, days]);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background shadow-card">
      {/* Day headers */}
      <div className="grid border-b border-border" style={gridTemplate()}>
        <div className="h-16 border-r border-border" />
        {days.map((day, i) => {
          const isToday = isSameDay(day, today);
          return (
            <div
              key={i}
              className={cn(
                'flex h-16 flex-col items-center justify-center gap-0.5 border-r border-border last:border-r-0',
                isToday && 'bg-surface-muted',
              )}
            >
              <span className="text-[11px] font-medium uppercase tracking-wider text-foreground-faint">
                {format(day, 'EEE')}
              </span>
              <span
                className={cn(
                  'text-xl font-semibold tracking-tight',
                  isToday ? 'text-foreground' : 'text-foreground-muted',
                )}
              >
                {format(day, 'd')}
              </span>
            </div>
          );
        })}
      </div>

      {/* Hour grid */}
      <div className="relative grid" style={gridTemplate()}>
        {/* Hour labels column */}
        <div className="border-r border-border">
          {hours.map((h) => (
            <div
              key={h}
              className="flex items-start justify-end border-b border-border pr-3 pt-1 text-[11px] font-medium text-foreground-faint last:border-b-0"
              style={{ height: ROW_HEIGHT_PX }}
            >
              {format(new Date(2000, 0, 1, h), 'h a')}
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map((_, dayIdx) => (
          <div
            key={dayIdx}
            className="relative border-r border-border last:border-r-0"
            style={{ height: ROW_HEIGHT_PX * HOURS_SHOWN }}
          >
            {/* Hour lines */}
            {hours.map((_, hi) => (
              <div
                key={hi}
                className="absolute left-0 right-0 border-b border-border"
                style={{ top: (hi + 1) * ROW_HEIGHT_PX }}
              />
            ))}

            {/* Tasks */}
            {(tasksByDay.get(dayIdx) ?? []).map((task) => (
              <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function TaskCard({ task, onClick }: { task: MockTask; onClick: () => void }) {
  const palette = TASK_PALETTE[task.colorIndex % TASK_PALETTE.length]!;
  const startHours = task.start.getHours() + task.start.getMinutes() / 60 - HOUR_START;
  const endHours = task.end.getHours() + task.end.getMinutes() / 60 - HOUR_START;
  const top = startHours * ROW_HEIGHT_PX;
  const height = Math.max(28, (endHours - startHours) * ROW_HEIGHT_PX - 4);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'absolute left-1 right-1 flex flex-col gap-0.5 overflow-hidden rounded-md border border-transparent p-2 text-left transition-shadow hover:shadow-card',
        palette.bg,
        palette.text,
      )}
      style={{ top, height }}
    >
      <span className="truncate text-xs font-semibold">{task.itemName}</span>
      <span className="truncate text-[11px] opacity-80">
        {format(task.start, 'HH:mm')} – {format(task.end, 'HH:mm')}
        {task.roomName ? ` · ${task.roomName}` : ''}
      </span>
    </button>
  );
}

function gridTemplate() {
  return { gridTemplateColumns: `72px repeat(${DAYS_IN_WEEK}, minmax(0, 1fr))` };
}
