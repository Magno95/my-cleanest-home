import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase.js';
import { queryKeys } from '../../lib/query-keys.js';

export interface AreaSummary {
  id: string;
  roomId: string;
  name: string;
  createdAt: string;
}

async function fetchAreas(roomId: string): Promise<AreaSummary[]> {
  const { data, error } = await supabase
    .from('areas')
    .select('id, room_id, name, created_at')
    .eq('room_id', roomId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    roomId: row.room_id,
    name: row.name,
    createdAt: row.created_at,
  }));
}

export function useAreas(roomId: string) {
  return useQuery({
    queryKey: queryKeys.areas.listByRoom(roomId),
    queryFn: () => fetchAreas(roomId),
  });
}
