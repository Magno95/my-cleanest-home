import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase.js';
import { queryKeys } from '../../lib/query-keys.js';

interface JoinHomeByCodeInput {
  code: string;
}

export async function joinHomeByCode({ code }: JoinHomeByCodeInput): Promise<string> {
  const normalizedCode = code.trim().toUpperCase();
  const { data, error } = await supabase.rpc('join_home_by_code', { code: normalizedCode });
  if (error) throw error;
  return data;
}

export function useJoinHomeByCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: joinHomeByCode,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.homes.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile.mine() });
    },
  });
}
