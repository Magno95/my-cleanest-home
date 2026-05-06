import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  buildCleaningDigestEmail,
  countDigestTasks,
  type CleaningDigestKind,
  type CleaningDigestSchedule,
  type CleaningDigestSection,
  type CleaningDigestTask,
} from '@mch/shared';

type JsonRecord = Record<string, unknown>;

type TaskRow = {
  id: string;
  cycle_id: string;
  due_at: string;
  status: 'pending';
};

type CycleRow = {
  id: string;
  item_id: string;
};

type ItemRow = {
  id: string;
  home_id: string;
  room_id: string | null;
  name: string;
};

type HomeRow = {
  id: string;
  name: string;
};

type RoomRow = {
  id: string;
  name: string;
};

type HomeMemberRow = {
  home_id: string;
  user_id: string;
};

type DeliveryRow = {
  id: string;
  created_at: string;
  digest_date: string;
  digest_kind: CleaningDigestKind;
  error_message: string | null;
  provider_message_id: string | null;
  recipient_email: string;
  status: DeliveryStatus;
  task_count: number;
  updated_at: string;
  user_id: string;
};

type ResendResponse = {
  id?: string;
};

type DeliveryStatus = 'pending' | 'sent' | 'failed';

type NotificationDeliveryInsert = {
  digest_date: string;
  digest_kind: CleaningDigestKind;
  recipient_email: string;
  status?: DeliveryStatus;
  task_count: number;
  user_id: string;
};

type NotificationDeliveryUpdate = {
  error_message?: string | null;
  provider_message_id?: string | null;
  status?: DeliveryStatus;
};

type ReadOnlyTable<Row> = {
  Insert: never;
  Relationships: [];
  Row: Row;
  Update: never;
};

interface FunctionDatabase {
  public: {
    CompositeTypes: Record<string, never>;
    Enums: {
      notification_delivery_status: DeliveryStatus;
      notification_digest_kind: CleaningDigestKind;
    };
    Functions: Record<string, never>;
    Tables: {
      cleaning_cycles: ReadOnlyTable<CycleRow>;
      home_members: ReadOnlyTable<HomeMemberRow>;
      homes: ReadOnlyTable<HomeRow>;
      items: ReadOnlyTable<ItemRow>;
      notification_deliveries: {
        Insert: NotificationDeliveryInsert;
        Relationships: [];
        Row: DeliveryRow;
        Update: NotificationDeliveryUpdate;
      };
      rooms: ReadOnlyTable<RoomRow>;
      tasks: ReadOnlyTable<TaskRow>;
    };
    Views: Record<string, never>;
  };
}

type DigestSupabaseClient = SupabaseClient<FunctionDatabase>;

interface FunctionEnv {
  APP_BASE_URL: string;
  EMAIL_FROM: string;
  RESEND_API_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_URL: string;
}

interface RunCleaningDigestOptions {
  recordDelivery?: boolean;
}

export async function runCleaningDigest(
  schedule: CleaningDigestSchedule,
  options: RunCleaningDigestOptions = {},
): Promise<JsonRecord> {
  const recordDelivery = options.recordDelivery ?? true;
  const env = loadFunctionEnv();
  const supabase: DigestSupabaseClient = createClient<FunctionDatabase>(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

  const digestSectionsByUser = await buildDigestSectionsByUser(supabase, schedule.cutoffIso);
  if (digestSectionsByUser.size === 0) {
    return { skipped: true, reason: 'no_pending_tasks', schedule };
  }

  const results = {
    failed: 0,
    sent: 0,
    skippedDuplicates: 0,
  };

  for (const [userId, sections] of digestSectionsByUser) {
    const userResult = await supabase.auth.admin.getUserById(userId);
    if (userResult.error || !userResult.data.user.email) {
      console.warn('Skipping digest recipient without email', {
        error: userResult.error?.message,
        userId,
      });
      continue;
    }

    const recipientEmail = userResult.data.user.email;
    const taskCount = countDigestTasks(sections);
    const deliveryId = recordDelivery
      ? await reserveDelivery(supabase, {
          digestDate: schedule.digestDate,
          digestKind: schedule.kind,
          recipientEmail,
          taskCount,
          userId,
        })
      : null;

    if (recordDelivery && !deliveryId) {
      results.skippedDuplicates += 1;
      continue;
    }

    const email = buildCleaningDigestEmail({
      appBaseUrl: env.APP_BASE_URL,
      digestDate: schedule.digestDate,
      kind: schedule.kind,
      sections,
    });

    try {
      const providerMessageId = await sendEmailWithResend(env, recipientEmail, email);
      if (deliveryId) {
        await updateDeliveryStatus(supabase, deliveryId, {
          providerMessageId,
          status: 'sent',
        });
      }
      results.sent += 1;
    } catch (error) {
      results.failed += 1;
      const errorMessage = error instanceof Error ? error.message : 'Unknown email delivery error';
      if (deliveryId) {
        await updateDeliveryStatus(supabase, deliveryId, {
          errorMessage,
          status: 'failed',
        });
      } else {
        console.error('Manual cleaning digest delivery failed', { errorMessage, userId });
      }
    }
  }

  return { deliveryLogEnabled: recordDelivery, schedule, ...results };
}

async function buildDigestSectionsByUser(
  supabase: DigestSupabaseClient,
  cutoffIso: string,
): Promise<Map<string, CleaningDigestSection[]>> {
  const tasks = await selectRows<TaskRow>(
    supabase
      .from('tasks')
      .select('id, cycle_id, due_at, status')
      .eq('status', 'pending')
      .lt('due_at', cutoffIso)
      .order('due_at', { ascending: true }),
  );
  if (tasks.length === 0) return new Map();

  const cycles = await selectRows<CycleRow>(
    supabase
      .from('cleaning_cycles')
      .select('id, item_id')
      .in('id', unique(tasks.map((task) => task.cycle_id))),
  );
  if (cycles.length === 0) return new Map();
  const cyclesById = mapById(cycles);

  const items = await selectRows<ItemRow>(
    supabase
      .from('items')
      .select('id, home_id, room_id, name')
      .in('id', unique(cycles.map((cycle) => cycle.item_id))),
  );
  if (items.length === 0) return new Map();
  const itemsById = mapById(items);

  const homes = await selectRows<HomeRow>(
    supabase
      .from('homes')
      .select('id, name')
      .in('id', unique(items.map((item) => item.home_id))),
  );
  if (homes.length === 0) return new Map();
  const homesById = mapById(homes);

  const roomIds = unique(items.flatMap((item) => (item.room_id ? [item.room_id] : [])));
  const rooms =
    roomIds.length > 0
      ? await selectRows<RoomRow>(supabase.from('rooms').select('id, name').in('id', roomIds))
      : [];
  const roomsById = mapById(rooms);

  const homeIds = unique(homes.map((home) => home.id));
  const members = await selectRows<HomeMemberRow>(
    supabase.from('home_members').select('home_id, user_id').in('home_id', homeIds),
  );

  const tasksByHome = new Map<string, CleaningDigestTask[]>();
  for (const task of tasks) {
    const cycle = cyclesById.get(task.cycle_id);
    if (!cycle) continue;

    const item = itemsById.get(cycle.item_id);
    if (!item) continue;

    const home = homesById.get(item.home_id);
    if (!home) continue;

    const homeTasks = tasksByHome.get(home.id) ?? [];
    homeTasks.push({
      dueAt: task.due_at,
      homeId: home.id,
      homeName: home.name,
      itemName: item.name,
      roomName: item.room_id ? (roomsById.get(item.room_id)?.name ?? null) : null,
    });
    tasksByHome.set(home.id, homeTasks);
  }

  const sectionsByUser = new Map<string, CleaningDigestSection[]>();
  for (const member of members) {
    const homeTasks = tasksByHome.get(member.home_id);
    const home = homesById.get(member.home_id);
    if (!homeTasks || !home || homeTasks.length === 0) continue;

    const sections = sectionsByUser.get(member.user_id) ?? [];
    sections.push({
      homeId: home.id,
      homeName: home.name,
      tasks: homeTasks,
    });
    sectionsByUser.set(member.user_id, sections);
  }

  return sectionsByUser;
}

async function reserveDelivery(
  supabase: DigestSupabaseClient,
  input: {
    digestKind: CleaningDigestKind;
    digestDate: string;
    recipientEmail: string;
    taskCount: number;
    userId: string;
  },
): Promise<string | null> {
  const { data, error } = await supabase
    .from('notification_deliveries')
    .insert({
      digest_date: input.digestDate,
      digest_kind: input.digestKind,
      recipient_email: input.recipientEmail,
      status: 'pending',
      task_count: input.taskCount,
      user_id: input.userId,
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') return null;
    throw error;
  }

  return (data as DeliveryRow).id;
}

async function updateDeliveryStatus(
  supabase: DigestSupabaseClient,
  deliveryId: string,
  input:
    | { status: 'sent'; providerMessageId: string | null }
    | { status: 'failed'; errorMessage: string },
): Promise<void> {
  const update =
    input.status === 'sent'
      ? {
          error_message: null,
          provider_message_id: input.providerMessageId,
          status: input.status,
        }
      : {
          error_message: input.errorMessage.slice(0, 2000),
          status: input.status,
        };

  const { error } = await supabase
    .from('notification_deliveries')
    .update(update)
    .eq('id', deliveryId);
  if (error) throw error;
}

async function sendEmailWithResend(
  env: FunctionEnv,
  recipientEmail: string,
  email: { subject: string; html: string; text: string },
): Promise<string | null> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      html: email.html,
      subject: email.subject,
      text: email.text,
      to: [recipientEmail],
    }),
  });

  const body = (await response.json().catch(() => null)) as ResendResponse | JsonRecord | null;

  if (!response.ok) {
    throw new Error(`Resend failed with ${response.status}: ${JSON.stringify(body)}`);
  }

  return body && 'id' in body && typeof body.id === 'string' ? body.id : null;
}

async function selectRows<T>(query: PromiseLike<{ data: unknown; error: unknown }>): Promise<T[]> {
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as T[];
}

function mapById<T extends { id: string }>(rows: T[]): Map<string, T> {
  return new Map(rows.map((row) => [row.id, row]));
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function loadFunctionEnv(): FunctionEnv {
  return {
    APP_BASE_URL: readEnv('APP_BASE_URL'),
    EMAIL_FROM: readEnv('EMAIL_FROM'),
    RESEND_API_KEY: readEnv('RESEND_API_KEY'),
    SUPABASE_SERVICE_ROLE_KEY: readEnv('SUPABASE_SERVICE_ROLE_KEY'),
    SUPABASE_URL: readEnv('SUPABASE_URL'),
  };
}

function readEnv(name: keyof FunctionEnv): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function json(body: JsonRecord, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
}
