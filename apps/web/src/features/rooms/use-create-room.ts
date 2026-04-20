import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase.js';
import { queryKeys } from '../../lib/query-keys.js';

interface CreateRoomInput {
  homeId: string;
  name: string;
}

async function createRoom({ homeId, name }: CreateRoomInput): Promise<void> {
  const { error } = await supabase.from('rooms').insert({ home_id: homeId, name });
  if (error) throw error;
}

export function useCreateRoom(homeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Omit<CreateRoomInput, 'homeId'>) => createRoom({ ...input, homeId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.rooms.listByHome(homeId) });
    },
  });
}
