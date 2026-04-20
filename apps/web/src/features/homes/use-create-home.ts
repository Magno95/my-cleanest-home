import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase.js';
import { queryKeys } from '../../lib/query-keys.js';
import type { HomeSummary } from './use-homes.js';

interface CreateHomeInput {
  name: string;
}

async function createHome({ name }: CreateHomeInput): Promise<HomeSummary> {
  const { data, error } = await supabase
    .from('homes')
    .insert({ name })
    .select('id, name, created_at')
    .single();

  if (error) throw error;
  return { id: data.id, name: data.name, createdAt: data.created_at };
}

export function useCreateHome() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createHome,
    onSuccess: (created) => {
      // Optimistic prepend: the list query is invalidated too, but this avoids
      // a flicker between mutation settle and refetch.
      queryClient.setQueryData<HomeSummary[]>(queryKeys.homes.list(), (prev) =>
        prev ? [created, ...prev] : [created],
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.homes.list() });
    },
  });
}
