import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase.js';
import { queryKeys } from '../../lib/query-keys.js';
import { useAuth } from '../../lib/auth.js';

export function useSetActiveHome() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (homeId: string | null) => {
      if (!user) throw new Error('Not signed in');
      const { error } = await supabase
        .from('user_profiles')
        .update({ active_home_id: homeId })
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile.mine() });
    },
  });
}
