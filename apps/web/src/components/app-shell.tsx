import { Link, Outlet } from '@tanstack/react-router';
import { CalendarDays, Settings2, Sparkles } from 'lucide-react';
import { cn } from '@mch/ui';
import { UserMenu } from './user-menu.js';
import { useFirstRunBootstrap } from '../features/bootstrap/use-first-run-bootstrap.js';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: CalendarDays, exact: true },
  { to: '/items', label: 'Cleaning items', icon: Sparkles, exact: false },
  { to: '/settings', label: 'Settings', icon: Settings2, exact: false },
] as const;

/**
 * Outer chrome for authenticated pages: sticky white header with brand mark
 * on the left, primary nav in the middle, user menu on the right.
 */
export function AppShell() {
  // Seed default home/room/items for first-time users.
  useFirstRunBootstrap();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="flex h-16 w-full items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2 text-foreground">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-brand-foreground">
              <Sparkles size={16} aria-hidden />
            </span>
            <span className="hidden text-base font-semibold tracking-tight sm:inline">
              My Cleanest Home
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map(({ to, label, icon: Icon, exact }) => (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact }}
                className="group inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-foreground-muted transition-colors hover:bg-surface-muted hover:text-foreground data-[status=active]:bg-surface-muted data-[status=active]:text-foreground"
              >
                {({ isActive }) => (
                  <span
                    className={cn(
                      'inline-flex items-center gap-2',
                      isActive ? 'text-foreground' : 'text-foreground-muted',
                    )}
                  >
                    <Icon size={16} aria-hidden />
                    <span className="hidden sm:inline">{label}</span>
                  </span>
                )}
              </Link>
            ))}
          </nav>

          <UserMenu />
        </div>
      </header>

      <main className="w-full px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <Outlet />
      </main>
    </div>
  );
}
