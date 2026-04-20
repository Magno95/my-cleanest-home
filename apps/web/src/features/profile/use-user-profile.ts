import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase.js';
import { queryKeys } from '../../lib/query-keys.js';
import { useAuth } from '../../lib/auth.js';

export interface UserProfile {
  userId: string;
  activeHomeId: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Reads the current user's profile row, creating it lazily if missing.
 * A row is guaranteed to exist after the query resolves successfully.
 */
async function fetchOrCreateProfile(userId: string): Promise<UserProfile> {
  const selectCols = 'user_id, active_home_id, created_at, updated_at';

  const { data: existing, error: readErr } = await supabase
    .from('user_profiles')
    .select(selectCols)
    .eq('user_id', userId)
    .maybeSingle();

  if (readErr) throw readErr;

  let row = existing;
  if (!row) {
    const { data: inserted, error: insertErr } = await supabase
      .from('user_profiles')
      .insert({ user_id: userId })
      .select(selectCols)
      .single();
    if (insertErr) throw insertErr;
    row = inserted;
  }

  return {
    userId: row.user_id,
    activeHomeId: row.active_home_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function useUserProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.profile.mine(),
    queryFn: () => fetchOrCreateProfile(user!.id),
    enabled: !!user,
  });
}
