import { useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase.js';
import { queryKeys } from '../../lib/query-keys.js';
import { useAuth } from '../../lib/auth.js';
import { useUserProfile } from '../profile/use-user-profile.js';
import { useHomes } from '../homes/use-homes.js';

/**
 * Default data seeded the first time a user signs in. Keeps the app usable
 * out of the box and gives us something to render on the calendar/search.
 */
const DEFAULT_HOME_NAME = 'Casa';
const DEFAULT_ROOM_NAME = 'Cucina';
const DEFAULT_ITEM_NAMES = ['Lavandino', 'Spazzatura - sotto lavandino'] as const;

/**
 * Creates a default home + room + items for a first-time user and sets the
 * new home as active. Safe to call multiple times: it no-ops if the user
 * already has at least one home.
 */
async function seedFirstRun(userId: string) {
  // Re-check at mutation time to avoid double seeding under strict mode.
  const { data: existingHomes, error: homesErr } = await supabase
    .from('homes')
    .select('id')
    .limit(1);
  if (homesErr) throw homesErr;
  if (existingHomes && existingHomes.length > 0) return null;

  const { data: home, error: homeErr } = await supabase
    .from('homes')
    .insert({ name: DEFAULT_HOME_NAME })
    .select('id')
    .single();
  if (homeErr) throw homeErr;

  const { data: room, error: roomErr } = await supabase
    .from('rooms')
    .insert({ home_id: home.id, name: DEFAULT_ROOM_NAME })
    .select('id')
    .single();
  if (roomErr) throw roomErr;

  const { error: itemsErr } = await supabase.from('items').insert(
    DEFAULT_ITEM_NAMES.map((name) => ({
      home_id: home.id,
      room_id: room.id,
      name,
    })),
  );
  if (itemsErr) throw itemsErr;

  const { error: profileErr } = await supabase
    .from('user_profiles')
    .update({ active_home_id: home.id })
    .eq('user_id', userId);
  if (profileErr) throw profileErr;

  return home.id;
}

/**
 * On first render after sign-in, check if the user has no homes; if so,
 * create Casa / Cucina / 2 mock items and mark the new home as active.
 *
 * Must be mounted inside the authenticated layout and below the providers
 * for `useAuth` and QueryClient.
 */
export function useFirstRunBootstrap() {
  const { user } = useAuth();
  const profileQuery = useUserProfile();
  const homesQuery = useHomes();
  const queryClient = useQueryClient();
  const triggered = useRef(false);

  const mutation = useMutation({
    mutationFn: (userId: string) => seedFirstRun(userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.homes.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile.mine() });
    },
  });

  useEffect(() => {
    if (!user) return;
    if (triggered.current) return;
    if (profileQuery.isLoading || homesQuery.isLoading) return;
    if (!profileQuery.data) return;
    if ((homesQuery.data?.length ?? 0) > 0) return;

    triggered.current = true;
    mutation.mutate(user.id);
  }, [
    user,
    profileQuery.isLoading,
    profileQuery.data,
    homesQuery.isLoading,
    homesQuery.data,
    mutation,
  ]);
}
