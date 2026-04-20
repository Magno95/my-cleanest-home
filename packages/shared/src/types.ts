/**
 * Shared domain types for My Cleanest Home.
 *
 * These mirror the canonical DB schema (see `packages/db/supabase/migrations`)
 * but are hand-written so both the API and the frontends can share the same
 * vocabulary without pulling in the Supabase-generated types.
 *
 * The Supabase-generated `Database` types live in `@mch/db` and should be used
 * at the data-access boundary; domain code should use these shapes instead.
 */

export type UUID = string;
export type ISODateString = string;

export type HomeRole = 'owner' | 'member';

/**
 * Supported cleaning cadence units. The numeric value is the frequency's
 * `interval_value` (e.g. every 2 weeks -> unit: 'week', value: 2).
 */
export type FrequencyUnit = 'day' | 'week' | 'month' | 'year';

export interface Frequency {
  unit: FrequencyUnit;
  value: number;
}

export interface User {
  id: UUID;
  email: string;
  displayName: string | null;
}

export interface Home {
  id: UUID;
  name: string;
  createdAt: ISODateString;
}

export interface HomeMember {
  homeId: UUID;
  userId: UUID;
  role: HomeRole;
}

export interface Room {
  id: UUID;
  homeId: UUID;
  name: string;
}

export interface Area {
  id: UUID;
  roomId: UUID;
  name: string;
}

export interface Item {
  id: UUID;
  areaId: UUID;
  name: string;
}

export interface CleaningCycle {
  id: UUID;
  itemId: UUID;
  frequency: Frequency;
  /** Last time the cycle was completed; null when never done. */
  lastDoneAt: ISODateString | null;
}

export type TaskStatus = 'pending' | 'done' | 'skipped';

export interface Task {
  id: UUID;
  cycleId: UUID;
  dueAt: ISODateString;
  status: TaskStatus;
  assignedTo: UUID | null;
  completedAt: ISODateString | null;
  completedBy: UUID | null;
}

export interface Assignment {
  taskId: UUID;
  userId: UUID;
}

/** Managed directly in the web app. */
export interface Product {
  id: UUID;
  name: string;
  brand: string | null;
  description: string | null;
}

/** Managed directly in the web app. */
export interface Tool {
  id: UUID;
  name: string;
  description: string | null;
}
