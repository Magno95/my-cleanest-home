import { useMemo } from 'react';
import { useHomes, type HomeSummary } from '../homes/use-homes.js';
import { useUserProfile } from '../profile/use-user-profile.js';

interface ActiveHomeState {
  home: HomeSummary | null;
  homes: HomeSummary[];
  isLoading: boolean;
  isError: boolean;
}

/**
 * Combines the profile's active_home_id with the user's homes list and falls
 * back to the first home when the stored id is missing or stale. A `null`
 * home means the user has not finished bootstrap yet.
 */
export function useActiveHome(): ActiveHomeState {
  const profile = useUserProfile();
  const homes = useHomes();

  const activeId = profile.data?.activeHomeId ?? null;
  const list = homes.data ?? [];

  const home = useMemo(() => {
    if (list.length === 0) return null;
    if (activeId) {
      const found = list.find((h) => h.id === activeId);
      if (found) return found;
    }
    return list[0] ?? null;
  }, [activeId, list]);

  return {
    home,
    homes: list,
    isLoading: profile.isLoading || homes.isLoading,
    isError: profile.isError || homes.isError,
  };
}
