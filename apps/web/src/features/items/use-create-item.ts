import { addFrequency } from '@mch/shared';
import type { Database } from '@mch/db';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase.js';
import { queryKeys } from '../../lib/query-keys.js';
import { ensureMiscellaneousRoom } from '../rooms/miscellaneous-room.js';

type FrequencyUnit = Database['public']['Enums']['frequency_unit'];

export interface CreateItemInput {
  homeId: string;
  roomId?: string | null;
  name: string;
  firstCleaningDate: string;
  frequencyUnit: FrequencyUnit;
  frequencyValue: number;
}

async function createItem({
  homeId,
  roomId,
  name,
  firstCleaningDate,
  frequencyUnit,
  frequencyValue,
}: CreateItemInput): Promise<void> {
  if (!Number.isInteger(frequencyValue) || frequencyValue < 1) {
    throw new Error('Cleaning frequency must be a positive integer.');
  }

  const firstCleaning = new Date(firstCleaningDate);
  if (Number.isNaN(firstCleaning.getTime())) {
    throw new Error('Choose a valid first cleaning day.');
  }

  const resolvedRoomId = roomId ?? (await ensureMiscellaneousRoom(homeId));

  const { data: insertedItem, error: itemError } = await supabase
    .from('items')
    .insert({ home_id: homeId, room_id: resolvedRoomId, name })
    .select('id')
    .single();

  if (itemError) throw itemError;

  const { data: cycle, error: cycleError } = await supabase
    .from('cleaning_cycles')
    .insert({
      item_id: insertedItem.id,
      frequency_unit: frequencyUnit,
      frequency_value: frequencyValue,
      last_done_at: null,
    })
    .select('id')
    .single();

  if (cycleError) throw cycleError;

  addFrequency(firstCleaning, {
    unit: frequencyUnit,
    value: frequencyValue,
  });

  const { error: taskError } = await supabase
    .from('tasks')
    .insert({ cycle_id: cycle.id, due_at: firstCleaning.toISOString(), status: 'pending' });

  if (taskError) throw taskError;
}

export function useCreateItem(homeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Omit<CreateItemInput, 'homeId'>) => createItem({ ...input, homeId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.items.listByHome(homeId) });
    },
  });
}
