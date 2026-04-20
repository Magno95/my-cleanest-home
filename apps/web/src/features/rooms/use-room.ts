import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase.js';
import { queryKeys } from '../../lib/query-keys.js';
import type { RoomSummary } from './use-rooms.js';

async function fetchRoom(id: string): Promise<RoomSummary> {
  const { data, error } = await supabase
    .from('rooms')
    .select('id, home_id, name, created_at')
    .eq('id', id)
    .single();

  if (error) throw error;
  return {
    id: data.id,
    homeId: data.home_id,
    name: data.name,
    createdAt: data.created_at,
  };
}

export function useRoom(id: string) {
  return useQuery({
    queryKey: queryKeys.rooms.detail(id),
    queryFn: () => fetchRoom(id),
  });
}
