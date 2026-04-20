import { addDays, endOfDay, format, isSameDay, startOfDay, startOfWeek } from 'date-fns';
import { Check, CheckCircle2, GripVertical, LoaderCircle } from 'lucide-react';
import { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@mch/ui';
import { TASK_PALETTE } from '../../features/tasks/mock-tasks.js';

export interface CalendarTask {
  id: string;
  itemId: string;
  itemName: string;
  roomName: string | null;
  start: Date;
  end: Date;
  colorIndex: number;
  status: 'pending' | 'done';
  completedAt: string | null;
}

interface WeeklyGridProps {
  weekAnchor: Date;
  tasks: CalendarTask[];
  onTaskClick: (task: CalendarTask) => void;
  onTaskMove?: (task: CalendarTask, nextStart: Date) => void;
  onTaskDone?: (task: CalendarTask) => void;
  completingTaskId?: string | null;
  movingTaskId?: string | null;
  today?: Date;
}

interface DragState {
  task: CalendarTask;
  grabOffsetX: number;
  grabOffsetY: number;
  originX: number;
  originY: number;
  originalDayIndex: number;
  originalIndex: number;
  pointerX: number;
  pointerY: number;
  previewWidth: number;
  started: boolean;
  targetDayIndex: number;
  targetIndex: number;
}

interface DropTarget {
  dayIndex: number;
  index: number;
}

const DAYS_IN_WEEK = 7;
const DRAG_THRESHOLD_PX = 6;

export function WeeklyGrid({
  weekAnchor,
  tasks,
  onTaskClick,
  onTaskMove,
  onTaskDone,
  completingTaskId,
  movingTaskId,
  today = new Date(),
}: WeeklyGridProps) {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const columnRefs = useRef<Array<HTMLElement | null>>([]);
  const cardRefs = useRef(new Map<string, HTMLDivElement>());
  const dragStateRef = useRef<DragState | null>(null);
  const visibleTasksByDayRef = useRef<Map<number, CalendarTask[]>>(new Map());

  const weekStart = useMemo(() => startOfWeek(weekAnchor, { weekStartsOn: 1 }), [weekAnchor]);
  const [dragState, setDragState] = useState<DragState | null>(null);

  const days = useMemo(
    () => Array.from({ length: DAYS_IN_WEEK }, (_, index) => addDays(weekStart, index)),
    [weekStart],
  );

  const visibleTasks = useMemo(() => {
    if (!dragState?.started) return tasks;
    return tasks.filter((task) => task.id !== dragState.task.id);
  }, [dragState, tasks]);

  const tasksByDay = useMemo(() => groupTasksByDay(visibleTasks, days), [days, visibleTasks]);

  useEffect(() => {
    dragStateRef.current = dragState;
  }, [dragState]);

  useEffect(() => {
    visibleTasksByDayRef.current = tasksByDay;
  }, [tasksByDay]);

  useEffect(() => {
    if (!dragState?.started) return;

    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;

    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';

    return () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
    };
  }, [dragState?.started]);

  useEffect(() => {
    if (!dragState) return;

    function handlePointerMove(event: PointerEvent) {
      const current = dragStateRef.current;
      if (!current || !boardRef.current) return;

      setDragState((previous) => {
        if (!previous || !boardRef.current) return previous;

        const movedEnough =
          current.started ||
          Math.abs(event.clientX - current.originX) > DRAG_THRESHOLD_PX ||
          Math.abs(event.clientY - current.originY) > DRAG_THRESHOLD_PX;

        if (!movedEnough) return previous;

        const nextTarget = resolveDropTarget(
          event.clientX,
          event.clientY,
          boardRef.current.getBoundingClientRect(),
          columnRefs.current,
          cardRefs.current,
          visibleTasksByDayRef.current,
        );

        return {
          ...previous,
          pointerX: event.clientX,
          pointerY: event.clientY,
          started: true,
          targetDayIndex: nextTarget.dayIndex,
          targetIndex: nextTarget.index,
        };
      });
    }

    function handlePointerUp() {
      const current = dragStateRef.current;
      if (!current) return;

      if (!current.started) {
        onTaskClick(current.task);
        setDragState(null);
        return;
      }

      const targetChanged =
        current.targetDayIndex !== current.originalDayIndex ||
        current.targetIndex !== current.originalIndex;

      if (targetChanged) {
        const nextStart = buildDropDate(
          days[current.targetDayIndex] ?? current.task.start,
          visibleTasksByDayRef.current.get(current.targetDayIndex) ?? [],
          current.targetIndex,
        );

        if (nextStart.getTime() !== current.task.start.getTime()) {
          onTaskMove?.(current.task, nextStart);
        }
      }

      setDragState(null);
    }

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp, { once: true });

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [days, dragState, onTaskClick, onTaskMove]);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-card">
      <div className="overflow-x-auto">
        <div ref={boardRef} className="relative grid min-w-[980px] grid-cols-7">
          {days.map((day, dayIndex) => {
            const dayTasks = tasksByDay.get(dayIndex) ?? [];
            const isToday = isSameDay(day, today);
            const renderItems = insertPlaceholder(dayTasks, dragState, dayIndex);

            return (
              <section
                key={dayIndex}
                ref={(node) => {
                  columnRefs.current[dayIndex] = node;
                }}
                className="flex min-h-[420px] flex-col border-r border-border last:border-r-0"
              >
                <header
                  className={cn(
                    'border-b border-border px-4 py-4',
                    isToday ? 'bg-brand/5' : 'bg-surface-muted/35',
                  )}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-semibold uppercase tracking-[0.16em] text-foreground-muted">
                        {format(day, 'EEE')}
                      </span>
                      <span
                        className={cn(
                          'text-3xl font-bold tracking-tight',
                          isToday ? 'text-brand' : 'text-foreground',
                        )}
                      >
                        {format(day, 'd')}
                      </span>
                    </div>
                    <span className="text-xs font-medium uppercase tracking-[0.16em] text-foreground-faint">
                      {dayTasks.length} task{dayTasks.length === 1 ? '' : 's'}
                    </span>
                  </div>
                </header>

                <div className="flex min-h-0 flex-1 flex-col gap-3 p-3">
                  {renderItems.length === 0 ? (
                    <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border bg-surface-muted/20 px-4 text-center text-sm text-foreground-faint">
                      No tasks
                    </div>
                  ) : (
                    renderItems.map((entry) => {
                      if (entry.type === 'placeholder') {
                        return <DropPlaceholder key={`placeholder-${dayIndex}-${entry.index}`} />;
                      }

                      return (
                        <TaskCard
                          key={entry.task.id}
                          ref={(node) => {
                            if (node) {
                              cardRefs.current.set(entry.task.id, node);
                            } else {
                              cardRefs.current.delete(entry.task.id);
                            }
                          }}
                          task={entry.task}
                          isCompleting={completingTaskId === entry.task.id}
                          isMoving={movingTaskId === entry.task.id}
                          onDone={() => onTaskDone?.(entry.task)}
                          onPointerDown={(event) => {
                            if (entry.task.status === 'done') return;
                            event.preventDefault();

                            const rect = event.currentTarget.getBoundingClientRect();
                            setDragState({
                              task: entry.task,
                              grabOffsetX: event.clientX - rect.left,
                              grabOffsetY: event.clientY - rect.top,
                              originX: event.clientX,
                              originY: event.clientY,
                              originalDayIndex: dayIndex,
                              originalIndex: entry.index,
                              pointerX: event.clientX,
                              pointerY: event.clientY,
                              previewWidth: rect.width,
                              started: false,
                              targetDayIndex: dayIndex,
                              targetIndex: entry.index,
                            });
                          }}
                          onClick={() => onTaskClick(entry.task)}
                        />
                      );
                    })
                  )}
                </div>
              </section>
            );
          })}

          {dragState?.started && boardRef.current ? (
            <DragPreview
              task={dragState.task}
              boardRect={boardRef.current.getBoundingClientRect()}
              grabOffsetX={dragState.grabOffsetX}
              grabOffsetY={dragState.grabOffsetY}
              pointerX={dragState.pointerX}
              pointerY={dragState.pointerY}
              previewWidth={dragState.previewWidth}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

type RenderEntry =
  | { type: 'task'; index: number; task: CalendarTask }
  | { type: 'placeholder'; index: number };

const TaskCard = forwardRef<
  HTMLDivElement,
  {
    task: CalendarTask;
    isCompleting: boolean;
    isMoving: boolean;
    onDone: () => void;
    onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
    onClick: () => void;
  }
>(function TaskCard({ task, isCompleting, isMoving, onDone, onPointerDown, onClick }, ref) {
  const palette = TASK_PALETTE[task.colorIndex % TASK_PALETTE.length] ?? TASK_PALETTE[0];
  const done = task.status === 'done';

  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      onPointerDown={onPointerDown}
      onClick={() => {
        if (!done) return;
        onClick();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
      className={cn(
        'relative flex min-h-[88px] flex-col gap-2 overflow-hidden rounded-lg border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        done
          ? 'border-border-strong border-dashed bg-surface-muted/90 text-foreground-muted'
          : cn(
              'cursor-grab border-transparent hover:-translate-y-0.5 hover:shadow-hover active:cursor-grabbing',
              palette.bg,
              palette.text,
            ),
        isMoving && 'opacity-60',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="line-clamp-2 text-sm font-semibold leading-tight">{task.itemName}</span>
          <span className="truncate text-xs font-medium opacity-75">
            {task.roomName ?? 'No room assigned'}
          </span>
        </div>
        {done ? (
          <span className="mt-0.5 shrink-0 text-emerald-600">
            <CheckCircle2 size={16} aria-hidden />
          </span>
        ) : (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label={`Mark ${task.itemName} as done`}
              disabled={isCompleting}
              onPointerDown={(event) => {
                event.stopPropagation();
              }}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onDone();
              }}
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-foreground/15 bg-background/75 text-foreground/80 transition hover:bg-background disabled:cursor-wait disabled:opacity-60"
            >
              {isCompleting ? (
                <LoaderCircle size={14} className="animate-spin" aria-hidden />
              ) : (
                <Check size={14} aria-hidden />
              )}
            </button>
            <span className="mt-0.5 shrink-0 opacity-60">
              <GripVertical size={14} aria-hidden />
            </span>
          </div>
        )}
      </div>
    </div>
  );
});

function DropPlaceholder() {
  return (
    <div className="rounded-lg border border-dashed border-brand/50 bg-brand/5 px-3 py-5 text-center text-xs font-semibold uppercase tracking-[0.16em] text-brand">
      Drop here
    </div>
  );
}

function DragPreview({
  task,
  boardRect,
  grabOffsetX,
  grabOffsetY,
  pointerX,
  pointerY,
  previewWidth,
}: {
  task: CalendarTask;
  boardRect: DOMRect;
  grabOffsetX: number;
  grabOffsetY: number;
  pointerX: number;
  pointerY: number;
  previewWidth: number;
}) {
  const palette = TASK_PALETTE[task.colorIndex % TASK_PALETTE.length] ?? TASK_PALETTE[0];
  const left = clamp(
    pointerX - boardRect.left - grabOffsetX,
    8,
    boardRect.width - previewWidth - 8,
  );
  const top = clamp(pointerY - boardRect.top - grabOffsetY, 8, boardRect.height - 96);

  return (
    <div
      className={cn(
        'pointer-events-none absolute z-20 flex w-[calc((100%-48px)/7)] min-w-[120px] cursor-grabbing flex-col gap-1 rounded-lg border border-brand/40 p-3 opacity-95 shadow-hover',
        palette.bg,
        palette.text,
      )}
      style={{ left, top, width: previewWidth }}
    >
      <span className="line-clamp-2 text-sm font-semibold leading-tight">{task.itemName}</span>
      <span className="truncate text-xs font-medium opacity-75">
        {task.roomName ?? 'No room assigned'}
      </span>
    </div>
  );
}

function groupTasksByDay(tasks: CalendarTask[], days: Date[]) {
  const grouped = new Map<number, CalendarTask[]>();

  for (let dayIndex = 0; dayIndex < DAYS_IN_WEEK; dayIndex += 1) {
    grouped.set(dayIndex, []);
  }

  for (const task of tasks) {
    for (let dayIndex = 0; dayIndex < DAYS_IN_WEEK; dayIndex += 1) {
      if (!isSameDay(task.start, days[dayIndex] ?? task.start)) continue;
      grouped.get(dayIndex)?.push(task);
      break;
    }
  }

  for (let dayIndex = 0; dayIndex < DAYS_IN_WEEK; dayIndex += 1) {
    grouped.set(dayIndex, sortTasks(grouped.get(dayIndex) ?? []));
  }

  return grouped;
}

function sortTasks(tasks: CalendarTask[]) {
  return [...tasks].sort((leftTask, rightTask) => {
    const startDelta = leftTask.start.getTime() - rightTask.start.getTime();
    if (startDelta !== 0) return startDelta;
    return leftTask.itemName.localeCompare(rightTask.itemName);
  });
}

function insertPlaceholder(
  tasks: CalendarTask[],
  dragState: DragState | null,
  dayIndex: number,
): RenderEntry[] {
  const entries: RenderEntry[] = tasks.map((task, index) => ({ type: 'task', task, index }));

  if (!dragState?.started || dragState.targetDayIndex !== dayIndex) {
    return entries;
  }

  const nextEntries = [...entries];
  nextEntries.splice(dragState.targetIndex, 0, {
    type: 'placeholder',
    index: dragState.targetIndex,
  });
  return nextEntries;
}

function resolveDropTarget(
  pointerX: number,
  pointerY: number,
  boardRect: DOMRect,
  columnNodes: Array<HTMLElement | null>,
  cardNodes: Map<string, HTMLDivElement>,
  tasksByDay: Map<number, CalendarTask[]>,
): DropTarget {
  const columnWidth = boardRect.width / DAYS_IN_WEEK;
  const relativeX = clamp(pointerX - boardRect.left, 0, boardRect.width - 1);
  const dayIndex = clamp(Math.floor(relativeX / columnWidth), 0, DAYS_IN_WEEK - 1);
  const dayTasks = tasksByDay.get(dayIndex) ?? [];
  const columnNode = columnNodes[dayIndex];

  if (!columnNode || dayTasks.length === 0) {
    return { dayIndex, index: 0 };
  }

  const columnRect = columnNode.getBoundingClientRect();
  if (pointerY <= columnRect.top + 110) {
    return { dayIndex, index: 0 };
  }

  for (let index = 0; index < dayTasks.length; index += 1) {
    const cardNode = cardNodes.get(dayTasks[index]!.id);
    if (!cardNode) continue;
    const rect = cardNode.getBoundingClientRect();
    if (pointerY < rect.top + rect.height / 2) {
      return { dayIndex, index };
    }
  }

  return { dayIndex, index: dayTasks.length };
}

function buildDropDate(day: Date, dayTasks: CalendarTask[], targetIndex: number) {
  const previousTask = dayTasks[targetIndex - 1] ?? null;
  const nextTask = dayTasks[targetIndex] ?? null;
  const dayStart = startOfDay(day).getTime();
  const dayEnd = endOfDay(day).getTime();

  if (!previousTask && !nextTask) {
    return new Date(dayStart + 12 * 60 * 60 * 1000);
  }

  if (!previousTask && nextTask) {
    return new Date(midpoint(dayStart, nextTask.start.getTime()));
  }

  if (previousTask && !nextTask) {
    return new Date(midpoint(previousTask.start.getTime(), dayEnd));
  }

  return new Date(midpoint(previousTask!.start.getTime(), nextTask!.start.getTime()));
}

function midpoint(start: number, end: number) {
  if (end - start <= 1) return start;
  return Math.floor((start + end) / 2);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
