interface ClientEnv {
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;
}

const required: Array<keyof ClientEnv> = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];

function readEnv(): ClientEnv {
  const raw = import.meta.env as unknown as Record<string, string | undefined>;
  const missing = required.filter((k) => !raw[k]);
  if (missing.length > 0) {
    throw new Error(`Missing client env vars: ${missing.join(', ')}`);
  }
  return {
    VITE_SUPABASE_URL: raw.VITE_SUPABASE_URL!,
    VITE_SUPABASE_ANON_KEY: raw.VITE_SUPABASE_ANON_KEY!,
  };
}

export const env: ClientEnv = readEnv();
