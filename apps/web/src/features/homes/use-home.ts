import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase.js';
import { queryKeys } from '../../lib/query-keys.js';
import type { HomeSummary } from './use-homes.js';

async function fetchHome(id: string): Promise<HomeSummary> {
  const { data, error } = await supabase
    .from('homes')
    .select('id, name, join_code, created_at')
    .eq('id', id)
    .single();

  if (error) throw error;
  return {
    id: data.id,
    name: data.name,
    createdAt: data.created_at,
    joinCode: data.join_code,
  };
}

export function useHome(id: string) {
  return useQuery({
    queryKey: queryKeys.homes.detail(id),
    queryFn: () => fetchHome(id),
  });
}
