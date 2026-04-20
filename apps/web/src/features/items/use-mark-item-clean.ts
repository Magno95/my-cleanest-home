import { nextDueDate } from '@mch/shared';
import type { Database } from '@mch/db';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../lib/auth.js';
import { queryKeys } from '../../lib/query-keys.js';
import { supabase } from '../../lib/supabase.js';

type FrequencyUnit = Database['public']['Enums']['frequency_unit'];

interface CycleRow {
  id: string;
  item_id: string;
  frequency_unit: FrequencyUnit;
  frequency_value: number;
  last_done_at: string | null;
}

export interface MarkItemCleanInput {
  itemId: string;
  homeId: string;
}

async function markItemClean(input: MarkItemCleanInput, userId: string | null): Promise<void> {
  const { data: cycle, error: cycleError } = await supabase
    .from('cleaning_cycles')
    .select('id, item_id, frequency_unit, frequency_value, last_done_at')
    .eq('item_id', input.itemId)
    .single();

  if (cycleError) throw cycleError;

  const { data: pendingTasks, error: pendingTasksError } = await supabase
    .from('tasks')
    .select('id')
    .eq('cycle_id', cycle.id)
    .eq('status', 'pending')
    .order('due_at', { ascending: true });

  if (pendingTasksError) throw pendingTasksError;

  const now = new Date();
  const nowIso = now.toISOString();

  if ((pendingTasks?.length ?? 0) > 0) {
    const [currentTask, ...rest] = pendingTasks ?? [];
    if (!currentTask) {
      throw new Error('Expected pending task to exist.');
    }
    const { error: doneError } = await supabase
      .from('tasks')
      .update({
        completed_at: nowIso,
        completed_by: userId,
        due_at: nowIso,
        status: 'done',
      })
      .eq('id', currentTask.id);

    if (doneError) throw doneError;

    if (rest.length > 0) {
      const { error: skipError } = await supabase
        .from('tasks')
        .update({ status: 'skipped' })
        .in(
          'id',
          rest.map((task) => task.id),
        );

      if (skipError) throw skipError;
    }
  }

  const { error: cycleUpdateError } = await supabase
    .from('cleaning_cycles')
    .update({ last_done_at: nowIso })
    .eq('id', cycle.id);

  if (cycleUpdateError) throw cycleUpdateError;

  const nextDueAt = nextDueDate(
    {
      id: cycle.id,
      itemId: cycle.item_id,
      frequency: {
        unit: cycle.frequency_unit,
        value: cycle.frequency_value,
      },
      lastDoneAt: nowIso,
    },
    now,
  ).toISOString();

  const { error: insertError } = await supabase
    .from('tasks')
    .insert({ cycle_id: cycle.id, due_at: nextDueAt, status: 'pending' });

  if (insertError) throw insertError;
}

export function useMarkItemClean() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (input: MarkItemCleanInput) => markItemClean(input, user?.id ?? null),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.items.detail(variables.itemId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.items.listByHome(variables.homeId),
      });
    },
  });
}
