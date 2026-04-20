import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase.js';
import { queryKeys } from '../../lib/query-keys.js';

interface CreateHomeInput {
  name: string;
}

async function createHome({ name }: CreateHomeInput): Promise<void> {
  const { error } = await supabase.from('homes').insert({ name });

  if (error) throw error;
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
