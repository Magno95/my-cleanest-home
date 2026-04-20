/**
 * Central registry for TanStack Query keys.
 *
 * Keeping keys in one place avoids drift between `useQuery` and the
 * corresponding `queryClient.invalidateQueries` after mutations.
 */
export const queryKeys = {
  homes: {
    all: ['homes'] as const,
    list: () => [...queryKeys.homes.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.homes.all, 'detail', id] as const,
  },
  rooms: {
    all: ['rooms'] as const,
    listByHome: (homeId: string) => [...queryKeys.rooms.all, 'by-home', homeId] as const,
    detail: (id: string) => [...queryKeys.rooms.all, 'detail', id] as const,
  },
  items: {
    all: ['items'] as const,
    listByHome: (homeId: string) => [...queryKeys.items.all, 'by-home', homeId] as const,
    detail: (itemId: string) => [...queryKeys.items.all, 'detail', itemId] as const,
  },
  referenceData: {
    all: ['reference-data'] as const,
  },
  tasks: {
    all: ['tasks'] as const,
    weekByHome: (homeId: string, weekKey: string, itemIds: string[]) =>
      [...queryKeys.tasks.all, 'week', homeId, weekKey, itemIds] as const,
  },
  profile: {
    all: ['user-profile'] as const,
    mine: () => [...queryKeys.profile.all, 'mine'] as const,
  },
} as const;
