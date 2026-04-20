import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase.js';
import { queryKeys } from '../../lib/query-keys.js';

export interface HomeSummary {
  id: string;
  name: string;
  createdAt: string;
  joinCode: string;
}

async function fetchHomes(): Promise<HomeSummary[]> {
  const { data, error } = await supabase
    .from('homes')
    .select('id, name, join_code, created_at')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    joinCode: row.join_code,
  }));
}

export function useHomes() {
  return useQuery({
    queryKey: queryKeys.homes.list(),
    queryFn: fetchHomes,
  });
}
