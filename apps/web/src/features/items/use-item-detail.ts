import { nextDueDate } from '@mch/shared';
import type { Database } from '@mch/db';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/query-keys.js';
import { supabase } from '../../lib/supabase.js';

export const ITEM_REFERENCE_PHOTO_BUCKET = 'item-reference-photos';

export type FrequencyUnit = Database['public']['Enums']['frequency_unit'];

export interface ItemDetail {
  id: string;
  homeId: string;
  roomId: string | null;
  name: string;
  createdAt: string;
  cleaningMethod: string | null;
  cleaningTools: string[];
  cleaningProducts: string[];
  referencePhotoPath: string | null;
  referencePhotoUrl: string | null;
  frequencyUnit: FrequencyUnit | null;
  frequencyValue: number | null;
  lastDoneAt: string | null;
  nextDueAt: string | null;
  cleaningHistory: Array<{
    id: string;
    completedAt: string;
  }>;
}

async function fetchItemDetail(itemId: string): Promise<ItemDetail> {
  const { data: item, error: itemError } = await supabase
    .from('items')
    .select(
      'id, home_id, room_id, name, created_at, cleaning_method, cleaning_tools, cleaning_products, reference_photo_path',
    )
    .eq('id', itemId)
    .single();

  if (itemError) throw itemError;

  const { data: cycle, error: cycleError } = await supabase
    .from('cleaning_cycles')
    .select('id, item_id, frequency_unit, frequency_value, last_done_at')
    .eq('item_id', itemId)
    .maybeSingle();

  if (cycleError) throw cycleError;

  let nextDueAt: string | null = null;
  let cleaningHistory: ItemDetail['cleaningHistory'] = [];
  if (cycle) {
    const { data: nextTask, error: nextTaskError } = await supabase
      .from('tasks')
      .select('due_at')
      .eq('cycle_id', cycle.id)
      .eq('status', 'pending')
      .order('due_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (nextTaskError) throw nextTaskError;

    const { data: completedTasks, error: completedTasksError } = await supabase
      .from('tasks')
      .select('id, completed_at, due_at')
      .eq('cycle_id', cycle.id)
      .eq('status', 'done')
      .order('completed_at', { ascending: false, nullsFirst: false })
      .order('due_at', { ascending: false });

    if (completedTasksError) throw completedTasksError;

    cleaningHistory = (completedTasks ?? []).flatMap((task) => {
      const completedAt = task.completed_at ?? task.due_at;
      if (!completedAt) return [];
      return [{ id: task.id, completedAt }];
    });

    nextDueAt =
      nextTask?.due_at ??
      nextDueDate(
        {
          id: cycle.id,
          itemId: cycle.item_id,
          frequency: {
            unit: cycle.frequency_unit,
            value: cycle.frequency_value,
          },
          lastDoneAt: cycle.last_done_at,
        },
        new Date(),
      ).toISOString();
  }

  const referencePhotoUrl = item.reference_photo_path
    ? supabase.storage.from(ITEM_REFERENCE_PHOTO_BUCKET).getPublicUrl(item.reference_photo_path)
        .data.publicUrl
    : null;

  return {
    id: item.id,
    homeId: item.home_id,
    roomId: item.room_id,
    name: item.name,
    createdAt: item.created_at,
    cleaningMethod: item.cleaning_method,
    cleaningTools: item.cleaning_tools ?? [],
    cleaningProducts: item.cleaning_products ?? [],
    referencePhotoPath: item.reference_photo_path,
    referencePhotoUrl,
    frequencyUnit: cycle?.frequency_unit ?? null,
    frequencyValue: cycle?.frequency_value ?? null,
    lastDoneAt: cycle?.last_done_at ?? null,
    nextDueAt,
    cleaningHistory,
  };
}

export function useItemDetail(itemId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.items.detail(itemId ?? 'none'),
    queryFn: () => fetchItemDetail(itemId!),
    enabled: !!itemId,
  });
}
