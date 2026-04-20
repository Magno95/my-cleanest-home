import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase.js';
import { queryKeys } from '../../lib/query-keys.js';
import { ensureMiscellaneousRoom } from './miscellaneous-room.js';

export interface RoomSummary {
  id: string;
  homeId: string;
  name: string;
  colorKey: string | null;
  createdAt: string;
}

function isMissingRoomColorColumn(error: { message?: string; details?: string } | null) {
  const text = `${error?.message ?? ''} ${error?.details ?? ''}`.toLowerCase();
  return text.includes('color_key') && (text.includes('column') || text.includes('schema cache'));
}

function mapRoomRow(row: {
  id: string;
  home_id: string;
  name: string;
  created_at: string;
  color_key?: string | null;
}): RoomSummary {
  return {
    id: row.id,
    homeId: row.home_id,
    name: row.name,
    colorKey: row.color_key ?? null,
    createdAt: row.created_at,
  };
}

async function fetchRooms(homeId: string): Promise<RoomSummary[]> {
  await ensureMiscellaneousRoom(homeId);

  const primaryQuery = await supabase
    .from('rooms')
    .select('id, home_id, name, color_key, created_at')
    .eq('home_id', homeId)
    .order('created_at', { ascending: false });

  if (primaryQuery.error && isMissingRoomColorColumn(primaryQuery.error)) {
    const fallbackQuery = await supabase
      .from('rooms')
      .select('id, home_id, name, created_at')
      .eq('home_id', homeId)
      .order('created_at', { ascending: false });

    if (fallbackQuery.error) throw fallbackQuery.error;
    return (fallbackQuery.data ?? []).map((row) => mapRoomRow(row));
  }

  if (primaryQuery.error) throw primaryQuery.error;
  return (primaryQuery.data ?? []).map((row) => mapRoomRow(row));
}

export function useRooms(homeId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.rooms.listByHome(homeId ?? 'none'),
    queryFn: () => fetchRooms(homeId!),
    enabled: !!homeId,
  });
}
