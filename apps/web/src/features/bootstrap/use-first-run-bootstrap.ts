import type { Database } from '@mch/db';
import { addFrequency } from '@mch/shared';
import { subDays } from 'date-fns';
import { useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase.js';
import { queryKeys } from '../../lib/query-keys.js';
import { useAuth } from '../../lib/auth.js';
import { useUserProfile } from '../profile/use-user-profile.js';
import { useHomes } from '../homes/use-homes.js';
import { ensureMiscellaneousRoom } from '../rooms/miscellaneous-room.js';

/**
 * Demo data seeded for new/sparse homes. Keeps the app usable out of the box
 * and gives the dashboard/item-detail flows enough realistic data for testing.
 */
const DEFAULT_HOME_NAME = 'MyHome';
const ITEM_REFERENCE_PHOTO_BUCKET = 'item-reference-photos';

type FrequencyUnit = Database['public']['Enums']['frequency_unit'];

interface DemoItemSpec {
  roomName: string;
  name: string;
  cleaningMethod: string;
  cleaningTools: string[];
  cleaningProducts: string[];
  frequency: {
    unit: FrequencyUnit;
    value: number;
  };
  lastDoneDaysAgo: number;
  mockPhoto?: {
    slug: string;
    title: string;
    accent: string;
  };
}

const DEMO_ITEMS: readonly DemoItemSpec[] = [
  {
    roomName: 'Cucina',
    name: 'Lavandino',
    cleaningMethod:
      'Rimuovi residui dal filtro, spruzza sgrassatore delicato, passa spugna morbida, risciacqua e asciuga i bordi con panno in microfibra.',
    cleaningTools: ['Spugna morbida', 'Panno microfibra', 'Guanti'],
    cleaningProducts: ['Sgrassatore delicato', 'Detergente piatti'],
    frequency: { unit: 'day', value: 2 },
    lastDoneDaysAgo: 1,
    mockPhoto: { slug: 'lavandino-cucina', title: 'Lavandino cucina', accent: '#2fc1b4' },
  },
  {
    roomName: 'Cucina',
    name: 'Piano cottura',
    cleaningMethod:
      'Aspetta che superficie sia fredda, spruzza detergente, lascia agire 2 minuti, passa panno umido e asciuga bene per evitare aloni.',
    cleaningTools: ['Panno microfibra', 'Spatolina non abrasiva'],
    cleaningProducts: ['Sgrassatore cucina'],
    frequency: { unit: 'day', value: 3 },
    lastDoneDaysAgo: 2,
  },
  {
    roomName: 'Cucina',
    name: 'Frigorifero esterno',
    cleaningMethod:
      'Passa panno con detergente neutro sulle maniglie e porte, poi ripassa con panno asciutto per finitura uniforme.',
    cleaningTools: ['Panno microfibra'],
    cleaningProducts: ['Detergente neutro'],
    frequency: { unit: 'week', value: 1 },
    lastDoneDaysAgo: 5,
  },
  {
    roomName: 'Bagno',
    name: 'Lavabo bagno',
    cleaningMethod:
      'Spruzza anticalcare su rubinetto e vasca, attendi 3 minuti, strofina con spugna morbida e asciuga per evitare nuove macchie.',
    cleaningTools: ['Spugna morbida', 'Panno asciutto'],
    cleaningProducts: ['Anticalcare'],
    frequency: { unit: 'day', value: 3 },
    lastDoneDaysAgo: 1,
    mockPhoto: { slug: 'lavabo-bagno', title: 'Lavabo bagno', accent: '#1e998f' },
  },
  {
    roomName: 'Bagno',
    name: 'Specchio bagno',
    cleaningMethod:
      'Vaporizza poco detergente sul panno, non direttamente sullo specchio, pulisci dall’alto verso il basso e rifinisci con lato asciutto.',
    cleaningTools: ['Panno vetri', 'Panno microfibra'],
    cleaningProducts: ['Detergente vetri'],
    frequency: { unit: 'week', value: 1 },
    lastDoneDaysAgo: 4,
  },
] as const;

function createMockReferencePhotoSvg(title: string, accent: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900" role="img" aria-label="${title}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f7fffd"/>
      <stop offset="100%" stop-color="#d7f7f1"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="900" rx="48" fill="url(#bg)"/>
  <rect x="120" y="120" width="960" height="660" rx="36" fill="#ffffff" stroke="#d7e7e5" stroke-width="18"/>
  <rect x="190" y="210" width="820" height="120" rx="24" fill="${accent}" opacity="0.16"/>
  <rect x="240" y="400" width="720" height="48" rx="24" fill="#d9e6e3"/>
  <rect x="240" y="480" width="620" height="48" rx="24" fill="#d9e6e3"/>
  <circle cx="300" cy="270" r="40" fill="${accent}"/>
  <rect x="380" y="242" width="420" height="56" rx="18" fill="#1b2a28" opacity="0.88"/>
  <text x="380" y="645" fill="#1b2a28" font-size="56" font-family="Arial, sans-serif" font-weight="700">${title}</text>
  <text x="380" y="706" fill="#62706d" font-size="32" font-family="Arial, sans-serif">Mock reference photo for local testing</text>
</svg>`;
}

async function uploadMockReferencePhoto(
  homeId: string,
  itemId: string,
  spec: NonNullable<DemoItemSpec['mockPhoto']>,
) {
  const path = `${homeId}/${itemId}/mock-${spec.slug}.svg`;
  const file = new File(
    [createMockReferencePhotoSvg(spec.title, spec.accent)],
    `${spec.slug}.svg`,
    {
      type: 'image/svg+xml',
    },
  );
  const { error } = await supabase.storage
    .from(ITEM_REFERENCE_PHOTO_BUCKET)
    .upload(path, file, { contentType: 'image/svg+xml', upsert: true, cacheControl: '3600' });
  if (error) throw error;
  return path;
}

/**
 * Ensures the user has one active demo-ready home. If the home already exists
 * but only has sparse legacy seed data, enrich it with more rooms/items,
 * details, cleaning cycles, and initial future tasks.
 */
export async function ensureDemoData(
  userId: string,
  activeHomeId: string | null,
  options?: { reset?: boolean },
) {
  const { data: existingHomes, error: homesErr } = await supabase
    .from('homes')
    .select('id, created_at')
    .order('created_at', { ascending: true });
  if (homesErr) throw homesErr;

  let homeId = activeHomeId ?? existingHomes?.[0]?.id ?? null;

  if (!homeId) {
    const { data: home, error: homeErr } = await supabase
      .from('homes')
      .insert({ name: DEFAULT_HOME_NAME })
      .select('id')
      .single();
    if (homeErr) throw homeErr;
    homeId = home.id;
  }

  const { error: profileErr } = await supabase
    .from('user_profiles')
    .update({ active_home_id: homeId })
    .eq('user_id', userId);
  if (profileErr) throw profileErr;

  await ensureMiscellaneousRoom(homeId);

  if (options?.reset) {
    const { error: deleteItemsErr } = await supabase.from('items').delete().eq('home_id', homeId);
    if (deleteItemsErr) throw deleteItemsErr;

    const { error: deleteRoomsErr } = await supabase.from('rooms').delete().eq('home_id', homeId);
    if (deleteRoomsErr) throw deleteRoomsErr;

    await ensureMiscellaneousRoom(homeId);
  }

  const { data: existingRooms, error: roomsErr } = await supabase
    .from('rooms')
    .select('id, name')
    .eq('home_id', homeId);
  if (roomsErr) throw roomsErr;

  const roomsByName = new Map((existingRooms ?? []).map((room) => [room.name, room.id] as const));
  for (const roomName of new Set(DEMO_ITEMS.map((item) => item.roomName))) {
    if (roomsByName.has(roomName)) continue;
    const { data: room, error: roomErr } = await supabase
      .from('rooms')
      .insert({ home_id: homeId, name: roomName })
      .select('id, name')
      .single();
    if (roomErr) throw roomErr;
    roomsByName.set(room.name, room.id);
  }

  const { data: existingItems, error: itemsErr } = await supabase
    .from('items')
    .select('id, name, room_id')
    .eq('home_id', homeId);
  if (itemsErr) throw itemsErr;

  const itemsByName = new Map((existingItems ?? []).map((item) => [item.name, item] as const));
  const now = new Date();

  for (const itemSpec of DEMO_ITEMS) {
    const roomId = roomsByName.get(itemSpec.roomName);
    if (!roomId) {
      throw new Error(`Missing room ${itemSpec.roomName} while seeding demo data.`);
    }

    const existingItem = itemsByName.get(itemSpec.name);
    let itemId = existingItem?.id ?? null;

    if (existingItem) {
      const referencePhotoPath =
        itemSpec.mockPhoto && options?.reset
          ? await uploadMockReferencePhoto(homeId, existingItem.id, itemSpec.mockPhoto)
          : undefined;
      const { error: updateItemErr } = await supabase
        .from('items')
        .update({
          room_id: roomId,
          cleaning_method: itemSpec.cleaningMethod,
          cleaning_tools: itemSpec.cleaningTools,
          cleaning_products: itemSpec.cleaningProducts,
          ...(referencePhotoPath ? { reference_photo_path: referencePhotoPath } : {}),
        })
        .eq('id', existingItem.id);
      if (updateItemErr) throw updateItemErr;
      itemId = existingItem.id;
    } else {
      const { data: insertedItem, error: insertItemErr } = await supabase
        .from('items')
        .insert({
          home_id: homeId,
          room_id: roomId,
          name: itemSpec.name,
          cleaning_method: itemSpec.cleaningMethod,
          cleaning_tools: itemSpec.cleaningTools,
          cleaning_products: itemSpec.cleaningProducts,
        })
        .select('id')
        .single();
      if (insertItemErr) throw insertItemErr;
      itemId = insertedItem.id;

      if (itemSpec.mockPhoto) {
        const referencePhotoPath = await uploadMockReferencePhoto(
          homeId,
          itemId,
          itemSpec.mockPhoto,
        );
        const { error: photoRefErr } = await supabase
          .from('items')
          .update({ reference_photo_path: referencePhotoPath })
          .eq('id', itemId);
        if (photoRefErr) throw photoRefErr;
      }
    }

    const lastDoneAt = subDays(now, itemSpec.lastDoneDaysAgo).toISOString();
    const { data: cycle, error: cycleErr } = await supabase
      .from('cleaning_cycles')
      .upsert(
        {
          item_id: itemId,
          frequency_unit: itemSpec.frequency.unit,
          frequency_value: itemSpec.frequency.value,
          last_done_at: lastDoneAt,
        },
        { onConflict: 'item_id' },
      )
      .select('id')
      .single();
    if (cycleErr) throw cycleErr;

    const { data: pendingTask, error: pendingTaskErr } = await supabase
      .from('tasks')
      .select('id')
      .eq('cycle_id', cycle.id)
      .eq('status', 'pending')
      .limit(1)
      .maybeSingle();
    if (pendingTaskErr) throw pendingTaskErr;

    if (!pendingTask) {
      const dueAt = addFrequency(new Date(lastDoneAt), itemSpec.frequency).toISOString();
      const { error: taskErr } = await supabase
        .from('tasks')
        .insert({ cycle_id: cycle.id, due_at: dueAt, status: 'pending' });
      if (taskErr) throw taskErr;
    }
  }

  return homeId;
}

export async function resetDemoData(userId: string, activeHomeId: string | null) {
  return ensureDemoData(userId, activeHomeId, { reset: true });
}

/**
 * On first render after sign-in, ensure active home has enough realistic demo
 * data for calendar/detail flow testing.
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
    mutationFn: ({ userId, activeHomeId }: { userId: string; activeHomeId: string | null }) =>
      ensureDemoData(userId, activeHomeId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.homes.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile.mine() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.rooms.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.items.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });

  useEffect(() => {
    if (!user) return;
    if (triggered.current) return;
    if (profileQuery.isLoading || homesQuery.isLoading) return;
    if (!profileQuery.data) return;

    triggered.current = true;
    mutation.mutate({ userId: user.id, activeHomeId: profileQuery.data.activeHomeId });
  }, [
    user,
    profileQuery.isLoading,
    profileQuery.data,
    homesQuery.isLoading,
    homesQuery.data,
    mutation,
  ]);
}
