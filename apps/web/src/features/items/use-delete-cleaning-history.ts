import { nextDueDate } from '@mch/shared';
import type { Database } from '@mch/db';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/query-keys.js';
import { supabase } from '../../lib/supabase.js';

type FrequencyUnit = Database['public']['Enums']['frequency_unit'];

interface DeleteCleaningHistoryInput {
  historyTaskId: string;
  itemId: string;
  homeId: string;
}

interface CycleRow {
  id: string;
  item_id: string;
  frequency_unit: FrequencyUnit;
  frequency_value: number;
  last_done_at: string | null;
}

async function syncPendingTask(cycle: CycleRow, lastDoneAt: string | null) {
  const { data: pendingTasks, error: pendingTasksError } = await supabase
    .from('tasks')
    .select('id')
    .eq('cycle_id', cycle.id)
    .eq('status', 'pending')
    .order('due_at', { ascending: true });

  if (pendingTasksError) throw pendingTasksError;

  const nextDueAt = nextDueDate(
    {
      id: cycle.id,
      itemId: cycle.item_id,
      frequency: {
        unit: cycle.frequency_unit,
        value: cycle.frequency_value,
      },
      lastDoneAt,
    },
    new Date(),
  ).toISOString();

  const [currentPending, ...restPending] = pendingTasks ?? [];

  if (currentPending) {
    const { error: updatePendingError } = await supabase
      .from('tasks')
      .update({ due_at: nextDueAt })
      .eq('id', currentPending.id);

    if (updatePendingError) throw updatePendingError;
  } else {
    const { error: insertPendingError } = await supabase
      .from('tasks')
      .insert({ cycle_id: cycle.id, due_at: nextDueAt, status: 'pending' });

    if (insertPendingError) throw insertPendingError;
  }

  if (restPending.length > 0) {
    const { error: skipExtraPendingError } = await supabase
      .from('tasks')
      .update({ status: 'skipped' })
      .in(
        'id',
        restPending.map((task) => task.id),
      );

    if (skipExtraPendingError) throw skipExtraPendingError;
  }
}

async function deleteCleaningHistory({ historyTaskId, itemId }: DeleteCleaningHistoryInput) {
  const { data: cycle, error: cycleError } = await supabase
    .from('cleaning_cycles')
    .select('id, item_id, frequency_unit, frequency_value, last_done_at')
    .eq('item_id', itemId)
    .single();

  if (cycleError) throw cycleError;

  const { error: deleteError } = await supabase.from('tasks').delete().eq('id', historyTaskId);
  if (deleteError) throw deleteError;

  const { data: remainingDoneTasks, error: remainingDoneTasksError } = await supabase
    .from('tasks')
    .select('completed_at, due_at')
    .eq('cycle_id', cycle.id)
    .eq('status', 'done')
    .order('completed_at', { ascending: false, nullsFirst: false })
    .order('due_at', { ascending: false })
    .limit(1);

  if (remainingDoneTasksError) throw remainingDoneTasksError;

  const nextLastDoneAt =
    remainingDoneTasks?.[0]?.completed_at ?? remainingDoneTasks?.[0]?.due_at ?? null;

  const { error: cycleUpdateError } = await supabase
    .from('cleaning_cycles')
    .update({ last_done_at: nextLastDoneAt })
    .eq('id', cycle.id);

  if (cycleUpdateError) throw cycleUpdateError;

  await syncPendingTask(cycle, nextLastDoneAt);
}

export function useDeleteCleaningHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCleaningHistory,
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.items.detail(variables.itemId) });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.items.listByHome(variables.homeId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
}
