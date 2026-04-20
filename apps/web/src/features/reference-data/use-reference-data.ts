import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/query-keys.js';
import { supabase } from '../../lib/supabase.js';

export interface ReferenceProduct {
  id: string;
  name: string;
  brand: string | null;
  description: string | null;
}

export interface ReferenceTool {
  id: string;
  name: string;
  description: string | null;
}

export interface ReferenceDataPayload {
  products: ReferenceProduct[];
  tools: ReferenceTool[];
}

async function fetchReferenceData(): Promise<ReferenceDataPayload> {
  const [productsResult, toolsResult] = await Promise.all([
    supabase.from('products').select('id, name, brand, description').order('name'),
    supabase.from('tools').select('id, name, description').order('name'),
  ]);

  if (productsResult.error) throw productsResult.error;
  if (toolsResult.error) throw toolsResult.error;

  return {
    products: (productsResult.data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      brand: row.brand,
      description: row.description,
    })),
    tools: (toolsResult.data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
    })),
  };
}

export function useReferenceData() {
  return useQuery({
    queryKey: queryKeys.referenceData.all,
    queryFn: fetchReferenceData,
  });
}
