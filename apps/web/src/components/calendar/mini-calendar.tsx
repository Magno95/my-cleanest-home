import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isSameWeek,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button, cn } from '@mch/ui';

interface MiniCalendarProps {
  selectedDate: Date;
  onSelect: (date: Date) => void;
}

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;

/**
 * Airbnb-style compact month grid. Highlights the whole current week (the
 * "view window") and the selected day. Navigation by month with arrows.
 */
export function MiniCalendar({ selectedDate, onSelect }: MiniCalendarProps) {
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(selectedDate));

  const days = useMemo(() => {
    const gridStart = startOfWeek(startOfMonth(visibleMonth), { weekStartsOn: 1 });
    const gridEnd = endOfWeek(endOfMonth(visibleMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [visibleMonth]);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-background p-4 shadow-card">
      <header className="flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-tight text-foreground">
          {format(visibleMonth, 'MMMM yyyy')}
        </h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Previous month"
            onClick={() => setVisibleMonth((m) => subMonths(m, 1))}
          >
            <ChevronLeft size={16} aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Next month"
            onClick={() => setVisibleMonth((m) => addMonths(m, 1))}
          >
            <ChevronRight size={16} aria-hidden />
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-7 text-center text-[11px] font-medium text-foreground-faint">
        {WEEKDAYS.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const inMonth = isSameMonth(day, visibleMonth);
          const isSelected = isSameDay(day, selectedDate);
          const inSelectedWeek = isSameWeek(day, selectedDate, { weekStartsOn: 1 });

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelect(day)}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-sm transition-colors',
                !inMonth && 'text-foreground-faint',
                inMonth && !isSelected && 'text-foreground hover:bg-surface-muted',
                inSelectedWeek && !isSelected && 'bg-surface-muted',
                isSelected && 'bg-foreground text-background',
              )}
              aria-pressed={isSelected}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>
    </div>
  );
}
