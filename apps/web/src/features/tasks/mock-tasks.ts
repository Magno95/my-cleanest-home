import { addDays, addMinutes, setHours, setMinutes, startOfWeek } from 'date-fns';
import type { ItemSummary } from '../items/use-items.js';
import type { RoomSummary } from '../rooms/use-rooms.js';

export interface MockTask {
  id: string;
  itemId: string;
  itemName: string;
  roomName: string | null;
  start: Date;
  end: Date;
  colorIndex: number;
}

export type TaskPaletteKey = 'rose' | 'mint' | 'sky' | 'amber' | 'violet';

/**
 * Ordered pastel palette used by the calendar task cards. Index loops modulo
 * the palette length so items get a stable colour per week.
 */
export const TASK_PALETTE = [
  { id: 'rose', label: 'Rose', bg: 'bg-pink-100', stripe: 'bg-pink-400', text: 'text-pink-900' },
  {
    id: 'mint',
    label: 'Mint',
    bg: 'bg-emerald-100',
    stripe: 'bg-emerald-400',
    text: 'text-emerald-900',
  },
  { id: 'sky', label: 'Sky', bg: 'bg-sky-100', stripe: 'bg-sky-400', text: 'text-sky-900' },
  {
    id: 'amber',
    label: 'Amber',
    bg: 'bg-amber-100',
    stripe: 'bg-amber-400',
    text: 'text-amber-900',
  },
  {
    id: 'violet',
    label: 'Violet',
    bg: 'bg-violet-100',
    stripe: 'bg-violet-400',
    text: 'text-violet-900',
  },
] as const;

export function getTaskPaletteIndex(colorKey: string | null | undefined, fallbackIndex = 0) {
  if (colorKey) {
    const explicitIndex = TASK_PALETTE.findIndex((option) => option.id === colorKey);
    if (explicitIndex >= 0) return explicitIndex;
  }

  return fallbackIndex % TASK_PALETTE.length;
}

export const HOUR_START = 8; // 08:00
export const HOUR_END = 20; // 20:00 exclusive
export const HOURS_SHOWN = HOUR_END - HOUR_START;

/** Seed offsets per item (minutes). Deterministic from item id hash so the
 *  mock tasks don't jump around between renders. */
function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/**
 * Generates mock weekly cleaning tasks for the given items, spreading them
 * across weekdays and time slots deterministically. Used while the real
 * cleaning_cycles engine is still being built.
 */
export function generateMockTasks(
  items: ItemSummary[],
  rooms: RoomSummary[],
  weekAnchor: Date,
): MockTask[] {
  const weekStart = startOfWeek(weekAnchor, { weekStartsOn: 1 }); // Monday
  const roomsById = new Map(rooms.map((r) => [r.id, r] as const));
  const roomColorIndices = new Map(
    rooms.map((room, index) => [room.id, getTaskPaletteIndex(room.colorKey, index)] as const),
  );

  return items.flatMap((item, i) => {
    const seed = hashSeed(item.id);
    const dayOffset = seed % 5; // Mon..Fri
    const hourOffset = (seed >> 3) % HOURS_SHOWN; // 08..19
    const minuteOffset = (seed >> 6) % 2 === 0 ? 0 : 30;
    const durationMin = 30 + ((seed >> 9) % 3) * 15; // 30/45/60 min

    const start = setMinutes(
      setHours(addDays(weekStart, dayOffset), HOUR_START + hourOffset),
      minuteOffset,
    );
    const end = addMinutes(start, durationMin);
    const room = item.roomId ? (roomsById.get(item.roomId) ?? null) : null;

    return [
      {
        id: `${item.id}-${weekStart.getTime()}`,
        itemId: item.id,
        itemName: item.name,
        roomName: room?.name ?? null,
        start,
        end,
        colorIndex: room?.id ? (roomColorIndices.get(room.id) ?? 0) : i % TASK_PALETTE.length,
      } satisfies MockTask,
    ];
  });
}
