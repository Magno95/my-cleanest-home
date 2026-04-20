import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase.js';
import { queryKeys } from '../../lib/query-keys.js';
import type { TaskPaletteKey } from '../tasks/mock-tasks.js';

interface UpdateRoomColorInput {
  roomId: string;
  colorKey: TaskPaletteKey | null;
}

async function updateRoomColor({ roomId, colorKey }: UpdateRoomColorInput) {
  const { error } = await supabase.from('rooms').update({ color_key: colorKey }).eq('id', roomId);

  if (error) throw error;
}

export function useUpdateRoomColor(homeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateRoomColor,
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.rooms.listByHome(homeId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.rooms.detail(variables.roomId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
}
