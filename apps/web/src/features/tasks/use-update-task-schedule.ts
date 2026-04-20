import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/query-keys.js';
import { supabase } from '../../lib/supabase.js';

export interface UpdateTaskScheduleInput {
  taskId: string;
  itemId: string;
  homeId: string;
  dueAt: string;
}

async function updateTaskSchedule(input: UpdateTaskScheduleInput) {
  const { error } = await supabase
    .from('tasks')
    .update({ due_at: input.dueAt })
    .eq('id', input.taskId)
    .eq('status', 'pending');

  if (error) throw error;
}

export function useUpdateTaskSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateTaskSchedule,
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.items.detail(variables.itemId) });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.items.listByHome(variables.homeId),
      });
    },
  });
}
