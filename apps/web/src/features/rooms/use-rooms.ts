import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase.js';
import { queryKeys } from '../../lib/query-keys.js';

export interface RoomSummary {
  id: string;
  homeId: string;
  name: string;
  createdAt: string;
}

async function fetchRooms(homeId: string): Promise<RoomSummary[]> {
  const { data, error } = await supabase
    .from('rooms')
    .select('id, home_id, name, created_at')
    .eq('home_id', homeId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    homeId: row.home_id,
    name: row.name,
    createdAt: row.created_at,
  }));
}

export function useRooms(homeId: string) {
  return useQuery({
    queryKey: queryKeys.rooms.listByHome(homeId),
    queryFn: () => fetchRooms(homeId),
  });
}
