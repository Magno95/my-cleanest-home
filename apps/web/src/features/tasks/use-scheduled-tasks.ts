import { endOfWeek, startOfWeek } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/query-keys.js';
import { supabase } from '../../lib/supabase.js';

export interface ScheduledTaskRecord {
  id: string;
  itemId: string;
  dueAt: string;
  status: 'pending' | 'done';
  completedAt: string | null;
}

async function fetchScheduledTasks(
  homeId: string,
  weekAnchor: Date,
  itemIds: string[],
): Promise<ScheduledTaskRecord[]> {
  if (itemIds.length === 0) return [];

  const { data: cycles, error: cyclesError } = await supabase
    .from('cleaning_cycles')
    .select('id, item_id')
    .in('item_id', itemIds);

  if (cyclesError) throw cyclesError;
  if (!cycles || cycles.length === 0) return [];

  const cycleById = new Map(cycles.map((cycle) => [cycle.id, cycle] as const));
  const weekStart = startOfWeek(weekAnchor, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(weekAnchor, { weekStartsOn: 1 });

  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('id, cycle_id, due_at, status, completed_at')
    .in(
      'cycle_id',
      cycles.map((cycle) => cycle.id),
    )
    .in('status', ['pending', 'done'])
    .gte('due_at', weekStart.toISOString())
    .lte('due_at', weekEnd.toISOString())
    .order('due_at', { ascending: true });

  if (tasksError) throw tasksError;

  return (tasks ?? []).flatMap((task) => {
    if (task.status !== 'pending' && task.status !== 'done') return [];

    const cycle = cycleById.get(task.cycle_id);
    if (!cycle) return [];
    return [
      {
        id: task.id,
        itemId: cycle.item_id,
        dueAt: task.due_at,
        status: task.status,
        completedAt: task.completed_at,
      },
    ];
  });
}

export function useScheduledTasks(
  homeId: string | null | undefined,
  weekAnchor: Date,
  itemIds: string[],
) {
  const weekKey = startOfWeek(weekAnchor, { weekStartsOn: 1 }).toISOString();

  return useQuery({
    queryKey: queryKeys.tasks.weekByHome(homeId ?? 'none', weekKey, itemIds),
    queryFn: () => fetchScheduledTasks(homeId!, weekAnchor, itemIds),
    enabled: !!homeId,
  });
}
