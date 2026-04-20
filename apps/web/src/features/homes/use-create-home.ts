import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase.js';
import { queryKeys } from '../../lib/query-keys.js';
import { ensureMiscellaneousRoom } from '../rooms/miscellaneous-room.js';

interface CreateHomeInput {
  name: string;
}

export async function createHome({ name }: CreateHomeInput): Promise<void> {
  const { data: homeId, error } = await supabase.rpc('create_home', { name });
  if (error) throw error;
  await ensureMiscellaneousRoom(homeId);
}

export function useCreateHome() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createHome,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.homes.list() });
    },
  });
}
