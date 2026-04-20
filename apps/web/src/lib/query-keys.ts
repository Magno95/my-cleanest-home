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
  areas: {
    all: ['areas'] as const,
    listByRoom: (roomId: string) => [...queryKeys.areas.all, 'by-room', roomId] as const,
  },
  items: {
    all: ['items'] as const,
    listByHome: (homeId: string) => [...queryKeys.items.all, 'by-home', homeId] as const,
  },
  profile: {
    all: ['user-profile'] as const,
    mine: () => [...queryKeys.profile.all, 'mine'] as const,
  },
} as const;
