import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase.js';
import { queryKeys } from '../../lib/query-keys.js';

interface CreateAreaInput {
  roomId: string;
  name: string;
}

async function createArea({ roomId, name }: CreateAreaInput): Promise<void> {
  const { error } = await supabase.from('areas').insert({ room_id: roomId, name });
  if (error) throw error;
}

export function useCreateArea(roomId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Omit<CreateAreaInput, 'roomId'>) => createArea({ ...input, roomId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.areas.listByRoom(roomId) });
    },
  });
}
