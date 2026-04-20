import { Link, Outlet } from '@tanstack/react-router';
import { Sparkles } from 'lucide-react';
import { UserMenu } from './user-menu.js';
import { useFirstRunBootstrap } from '../features/bootstrap/use-first-run-bootstrap.js';

/**
 * Outer chrome for authenticated pages: sticky white header with brand mark
 * on the left, user menu on the right. The main outlet sits on the warm
 * white canvas with generous vertical rhythm.
 */
export function AppShell() {
  // Seed default home/room/items for first-time users.
  useFirstRunBootstrap();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2 text-foreground">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-brand-foreground">
              <Sparkles size={16} aria-hidden />
            </span>
            <span className="text-base font-semibold tracking-tight">My Cleanest Home</span>
          </Link>

          <UserMenu />
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:py-14">
        <Outlet />
      </main>
    </div>
  );
}
