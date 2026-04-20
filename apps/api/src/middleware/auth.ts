import type { NextFunction, Request, Response } from 'express';
import { jwtVerify } from 'jose';
import { env } from '../env.js';

export interface AuthUser {
  id: string;
  email: string | null;
  role: string | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const encoder = new TextEncoder();
const secret = encoder.encode(env.SUPABASE_JWT_SECRET);

/**
 * Verifies the Bearer token against the Supabase JWT secret (HS256).
 * Attaches `req.user` on success, or responds 401.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'missing_bearer_token' });
    return;
  }

  const token = header.slice('Bearer '.length).trim();
  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ['HS256'],
      audience: 'authenticated',
    });
    req.user = {
      id: String(payload.sub ?? ''),
      email: (payload.email as string | undefined) ?? null,
      role: (payload.role as string | undefined) ?? null,
    };
    if (!req.user.id) {
      res.status(401).json({ error: 'invalid_token_subject' });
      return;
    }
    next();
  } catch {
    res.status(401).json({ error: 'invalid_token' });
  }
}
