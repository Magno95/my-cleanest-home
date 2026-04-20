import { nextDueDate } from '@mch/shared';
import type { Database } from '@mch/db';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/query-keys.js';
import { supabase } from '../../lib/supabase.js';
import { ITEM_REFERENCE_PHOTO_BUCKET } from './use-item-detail.js';

type FrequencyUnit = Database['public']['Enums']['frequency_unit'];

interface UpdateCycleRow {
  id: string;
  item_id: string;
  frequency_unit: FrequencyUnit;
  frequency_value: number;
  last_done_at: string | null;
}

export interface UpdateItemDetailsInput {
  itemId: string;
  homeId: string;
  cleaningMethod: string;
  cleaningTools: string[];
  cleaningProducts: string[];
  frequencyUnit: FrequencyUnit | null;
  frequencyValue: number | null;
  photoFile?: File | null;
  clearPhoto?: boolean;
  currentPhotoPath?: string | null;
}

function toNullableText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeList(values: string[]): string[] {
  return values.map((value) => value.trim()).filter(Boolean);
}

function fileExtension(file: File): string {
  const match = /\.([a-zA-Z0-9]+)$/.exec(file.name);
  return match?.[1]?.toLowerCase() ?? 'jpg';
}

async function uploadReferencePhoto(homeId: string, itemId: string, file: File): Promise<string> {
  const path = `${homeId}/${itemId}/${Date.now()}-${crypto.randomUUID()}.${fileExtension(file)}`;
  const { error } = await supabase.storage
    .from(ITEM_REFERENCE_PHOTO_BUCKET)
    .upload(path, file, { cacheControl: '3600', contentType: file.type, upsert: false });

  if (error) throw error;
  return path;
}

async function replacePendingTask(cycle: UpdateCycleRow): Promise<void> {
  const nextDueAt = nextDueDate(
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

  const { error: skipError } = await supabase
    .from('tasks')
    .update({ status: 'skipped' })
    .eq('cycle_id', cycle.id)
    .eq('status', 'pending');

  if (skipError) throw skipError;

  const { error: insertError } = await supabase
    .from('tasks')
    .insert({ cycle_id: cycle.id, due_at: nextDueAt, status: 'pending' });

  if (insertError) throw insertError;
}

async function updateItemDetails(input: UpdateItemDetailsInput): Promise<void> {
  if ((input.frequencyUnit === null) !== (input.frequencyValue === null)) {
    throw new Error('Set both cleaning frequency value and unit.');
  }

  if (
    input.frequencyValue !== null &&
    (!Number.isInteger(input.frequencyValue) || input.frequencyValue < 1)
  ) {
    throw new Error('Cleaning frequency must be a positive integer.');
  }

  const previousPhotoPath = input.currentPhotoPath ?? null;
  let referencePhotoPath = input.clearPhoto ? null : previousPhotoPath;

  if (input.photoFile) {
    referencePhotoPath = await uploadReferencePhoto(input.homeId, input.itemId, input.photoFile);
  }

  const { error: itemError } = await supabase
    .from('items')
    .update({
      cleaning_method: toNullableText(input.cleaningMethod),
      cleaning_tools: normalizeList(input.cleaningTools),
      cleaning_products: normalizeList(input.cleaningProducts),
      reference_photo_path: referencePhotoPath,
    })
    .eq('id', input.itemId);

  if (itemError) throw itemError;

  const { data: existingCycle, error: existingCycleError } = await supabase
    .from('cleaning_cycles')
    .select('id, item_id, frequency_unit, frequency_value, last_done_at')
    .eq('item_id', input.itemId)
    .maybeSingle();

  if (existingCycleError) throw existingCycleError;

  if (input.frequencyUnit && input.frequencyValue) {
    const { data: cycle, error: cycleError } = await supabase
      .from('cleaning_cycles')
      .upsert(
        {
          item_id: input.itemId,
          frequency_unit: input.frequencyUnit,
          frequency_value: input.frequencyValue,
          last_done_at: existingCycle?.last_done_at ?? null,
        },
        { onConflict: 'item_id' },
      )
      .select('id, item_id, frequency_unit, frequency_value, last_done_at')
      .single();

    if (cycleError) throw cycleError;
    await replacePendingTask(cycle);
  } else if (existingCycle) {
    const { error: skipError } = await supabase
      .from('tasks')
      .update({ status: 'skipped' })
      .eq('cycle_id', existingCycle.id)
      .eq('status', 'pending');

    if (skipError) throw skipError;

    const { error: deleteCycleError } = await supabase
      .from('cleaning_cycles')
      .delete()
      .eq('id', existingCycle.id);

    if (deleteCycleError) throw deleteCycleError;
  }

  if (previousPhotoPath && previousPhotoPath !== referencePhotoPath) {
    void supabase.storage.from(ITEM_REFERENCE_PHOTO_BUCKET).remove([previousPhotoPath]);
  }
}

export function useUpdateItemDetails() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateItemDetails,
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.items.listByHome(variables.homeId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.items.detail(variables.itemId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
}
