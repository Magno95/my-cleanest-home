import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase.js';

/**
 * Session lifecycle states:
 *   - `undefined`  → initial hydration, still awaiting `getSession()`
 *   - `null`       → resolved + signed-out
 *   - `Session`    → signed-in
 *
 * Guards rely on the three-state convention: routes should render a splash
 * while `session === undefined` rather than redirecting.
 */
export interface AuthState {
  session: Session | null | undefined;
  user: User | null;
}

const AuthContext = createContext<AuthState>({ session: undefined, user: null });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (mounted) setSession(data.session);
      })
      .catch(() => {
        if (mounted) setSession(null);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthState>(() => ({ session, user: session?.user ?? null }), [session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
