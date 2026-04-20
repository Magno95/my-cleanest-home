import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase.js';
import { queryKeys } from '../../lib/query-keys.js';

export interface HomeSummary {
  id: string;
  name: string;
  createdAt: string;
}

async function fetchHomes(): Promise<HomeSummary[]> {
  const { data, error } = await supabase
    .from('homes')
    .select('id, name, created_at')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
  }));
}

export function useHomes() {
  return useQuery({
    queryKey: queryKeys.homes.list(),
    queryFn: fetchHomes,
  });
}
