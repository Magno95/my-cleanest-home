import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@mch/db';
import { env } from '../env.js';

export const supabase: SupabaseClient<Database> = createClient<Database>(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  },
);
