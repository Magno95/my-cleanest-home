import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/query-keys.js';
import { supabase } from '../../lib/supabase.js';
import { ITEM_REFERENCE_PHOTO_BUCKET } from './use-item-detail.js';

interface DeleteItemInput {
  itemId: string;
  homeId: string;
}

async function deleteItem({ itemId, homeId }: DeleteItemInput) {
  const { data: item, error: itemError } = await supabase
    .from('items')
    .select('reference_photo_path')
    .eq('id', itemId)
    .eq('home_id', homeId)
    .maybeSingle();

  if (itemError) throw itemError;
  if (!item) throw new Error('Cleaning item was not found.');

  const { error: deleteError } = await supabase
    .from('items')
    .delete()
    .eq('id', itemId)
    .eq('home_id', homeId);

  if (deleteError) throw deleteError;

  if (item?.reference_photo_path) {
    void supabase.storage.from(ITEM_REFERENCE_PHOTO_BUCKET).remove([item.reference_photo_path]);
  }
}

export function useDeleteItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteItem,
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.items.listByHome(variables.homeId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.items.detail(variables.itemId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
}
