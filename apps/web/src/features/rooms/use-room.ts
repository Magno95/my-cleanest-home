import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase.js';
import { queryKeys } from '../../lib/query-keys.js';
import type { RoomSummary } from './use-rooms.js';

function isMissingRoomColorColumn(error: { message?: string; details?: string } | null) {
  const text = `${error?.message ?? ''} ${error?.details ?? ''}`.toLowerCase();
  return text.includes('color_key') && (text.includes('column') || text.includes('schema cache'));
}

async function fetchRoom(id: string): Promise<RoomSummary> {
  const primaryQuery = await supabase
    .from('rooms')
    .select('id, home_id, name, color_key, created_at')
    .eq('id', id)
    .single();

  if (primaryQuery.error && isMissingRoomColorColumn(primaryQuery.error)) {
    const fallbackQuery = await supabase
      .from('rooms')
      .select('id, home_id, name, created_at')
      .eq('id', id)
      .single();

    if (fallbackQuery.error) throw fallbackQuery.error;
    return {
      id: fallbackQuery.data.id,
      homeId: fallbackQuery.data.home_id,
      name: fallbackQuery.data.name,
      colorKey: null,
      createdAt: fallbackQuery.data.created_at,
    };
  }

  if (primaryQuery.error) throw primaryQuery.error;
  return {
    id: primaryQuery.data.id,
    homeId: primaryQuery.data.home_id,
    name: primaryQuery.data.name,
    colorKey: primaryQuery.data.color_key,
    createdAt: primaryQuery.data.created_at,
  };
}

export function useRoom(id: string) {
  return useQuery({
    queryKey: queryKeys.rooms.detail(id),
    queryFn: () => fetchRoom(id),
  });
}
