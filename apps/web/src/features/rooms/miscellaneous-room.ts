import { supabase } from '../../lib/supabase.js';

export const MISCELLANEOUS_ROOM_NAME = 'Miscellaneous';

export async function ensureMiscellaneousRoom(homeId: string) {
  const { data: existingRoom, error: existingRoomError } = await supabase
    .from('rooms')
    .select('id, name')
    .eq('home_id', homeId)
    .eq('name', MISCELLANEOUS_ROOM_NAME)
    .limit(1)
    .maybeSingle();

  if (existingRoomError) throw existingRoomError;

  if (existingRoom) {
    const { error: assignItemsError } = await supabase
      .from('items')
      .update({ room_id: existingRoom.id })
      .eq('home_id', homeId)
      .is('room_id', null);

    if (assignItemsError) throw assignItemsError;
    return existingRoom.id;
  }

  const { data: createdRoom, error: createdRoomError } = await supabase
    .from('rooms')
    .insert({ home_id: homeId, name: MISCELLANEOUS_ROOM_NAME })
    .select('id')
    .single();

  if (createdRoomError) throw createdRoomError;

  const { error: assignItemsError } = await supabase
    .from('items')
    .update({ room_id: createdRoom.id })
    .eq('home_id', homeId)
    .is('room_id', null);

  if (assignItemsError) throw assignItemsError;

  return createdRoom.id;
}
