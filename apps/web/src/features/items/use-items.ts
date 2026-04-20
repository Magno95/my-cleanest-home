import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase.js';
import { queryKeys } from '../../lib/query-keys.js';

export interface ItemSummary {
  id: string;
  homeId: string;
  roomId: string | null;
  name: string;
  createdAt: string;
}

async function fetchItems(homeId: string): Promise<ItemSummary[]> {
  const { data, error } = await supabase
    .from('items')
    .select('id, home_id, room_id, name, created_at')
    .eq('home_id', homeId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    homeId: row.home_id,
    roomId: row.room_id,
    name: row.name,
    createdAt: row.created_at,
  }));
}

export function useItems(homeId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.items.listByHome(homeId ?? 'none'),
    queryFn: () => fetchItems(homeId!),
    enabled: !!homeId,
  });
}
