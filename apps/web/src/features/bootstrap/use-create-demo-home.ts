import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/query-keys.js';
import { useAuth } from '../../lib/auth.js';
import { ensureDemoData } from './use-first-run-bootstrap.js';

export function useCreateDemoHome() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error('You must be signed in.');
      }

      return ensureDemoData(user.id, null);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.homes.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile.mine() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.rooms.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.items.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
}
