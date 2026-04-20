import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase.js';
import { queryKeys } from '../../lib/query-keys.js';

export interface CreateItemInput {
  homeId: string;
  roomId?: string | null;
  name: string;
}

async function createItem({ homeId, roomId, name }: CreateItemInput): Promise<void> {
  const { error } = await supabase
    .from('items')
    .insert({ home_id: homeId, room_id: roomId ?? null, name });
  if (error) throw error;
}

export function useCreateItem(homeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Omit<CreateItemInput, 'homeId'>) => createItem({ ...input, homeId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.items.listByHome(homeId) });
    },
  });
}
