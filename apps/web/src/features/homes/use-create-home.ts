import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase.js';
import { queryKeys } from '../../lib/query-keys.js';
import { ensureMiscellaneousRoom } from '../rooms/miscellaneous-room.js';

interface CreateHomeInput {
  name: string;
}

async function createHome({ name }: CreateHomeInput): Promise<void> {
  const { data: home, error } = await supabase.from('homes').insert({ name }).select('id').single();

  if (error) throw error;
  await ensureMiscellaneousRoom(home.id);
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
