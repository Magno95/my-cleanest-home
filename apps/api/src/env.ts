import { z } from 'zod';

/**
 * Server-side environment schema.
 *
 * Parsed once at startup; exported `env` is a frozen, typed view. Never read
 * `process.env.*` directly from feature code — always import `env` here so the
 * schema stays the single source of truth.
 */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  /** The Supabase project URL (e.g. http://127.0.0.1:54321 in local dev). */
  SUPABASE_URL: z.string().url(),
  /** The Supabase JWT secret (HS256). Used to verify user access tokens. */
  SUPABASE_JWT_SECRET: z.string().min(16),
});

export type Env = z.infer<typeof schema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    throw new Error(`Invalid environment: ${parsed.error.message}`);
  }
  return Object.freeze(parsed.data);
}

export const env: Env = loadEnvOrStub();

function loadEnvOrStub(): Env {
  // During tests we don't require real env vars; each test can call loadEnv()
  // with an explicit source when needed.
  if (process.env.NODE_ENV === 'test') {
    return Object.freeze({
      NODE_ENV: 'test',
      PORT: 0,
      SUPABASE_URL: 'http://127.0.0.1:54321',
      SUPABASE_JWT_SECRET: 'test-secret-test-secret-test-secret',
    });
  }
  return loadEnv();
}
