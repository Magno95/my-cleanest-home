import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/query-keys.js';
import { supabase } from '../../lib/supabase.js';

export interface SaveProductInput {
  id?: string;
  name: string;
  brand: string;
  description: string;
}

export interface SaveToolInput {
  id?: string;
  name: string;
  description: string;
}

function toNullableText(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function saveProduct(input: SaveProductInput) {
  if (input.id) {
    const { error } = await supabase
      .from('products')
      .update({
        name: input.name.trim(),
        brand: toNullableText(input.brand),
        description: toNullableText(input.description),
      })
      .eq('id', input.id);

    if (error) throw error;
    return;
  }

  const { error } = await supabase.from('products').insert({
    name: input.name.trim(),
    brand: toNullableText(input.brand),
    description: toNullableText(input.description),
  });

  if (error) throw error;
}

async function deleteProduct(id: string) {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw error;
}

async function saveTool(input: SaveToolInput) {
  if (input.id) {
    const { error } = await supabase
      .from('tools')
      .update({
        name: input.name.trim(),
        description: toNullableText(input.description),
      })
      .eq('id', input.id);

    if (error) throw error;
    return;
  }

  const { error } = await supabase.from('tools').insert({
    name: input.name.trim(),
    description: toNullableText(input.description),
  });

  if (error) throw error;
}

async function deleteTool(id: string) {
  const { error } = await supabase.from('tools').delete().eq('id', id);
  if (error) throw error;
}

function useInvalidateReferenceData() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.referenceData.all });
  };
}

export function useSaveProduct() {
  const invalidate = useInvalidateReferenceData();

  return useMutation({
    mutationFn: saveProduct,
    onSuccess: () => invalidate(),
  });
}

export function useDeleteProduct() {
  const invalidate = useInvalidateReferenceData();

  return useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => invalidate(),
  });
}

export function useSaveTool() {
  const invalidate = useInvalidateReferenceData();

  return useMutation({
    mutationFn: saveTool,
    onSuccess: () => invalidate(),
  });
}

export function useDeleteTool() {
  const invalidate = useInvalidateReferenceData();

  return useMutation({
    mutationFn: deleteTool,
    onSuccess: () => invalidate(),
  });
}
