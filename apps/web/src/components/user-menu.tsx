import { useState } from 'react';
import { LogOut } from 'lucide-react';
import * as Avatar from '@radix-ui/react-avatar';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { toast } from 'sonner';
import { cn } from '@mch/ui';
import { signOut, useAuth } from '../lib/auth.js';

function initialsFrom(email: string): string {
  const local = email.split('@')[0] ?? email;
  const parts = local.split(/[._-]/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  }
  return local.slice(0, 2).toUpperCase();
}

export function UserMenu() {
  const { user } = useAuth();
  const [isPending, setIsPending] = useState(false);

  if (!user) return null;

  const handleSignOut = async () => {
    setIsPending(true);
    try {
      await signOut();
      toast.success('Signed out');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to sign out');
    } finally {
      setIsPending(false);
    }
  };

  const initials = initialsFrom(user.email ?? 'U');

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-full bg-surface-muted text-sm font-semibold text-foreground',
          'transition-shadow hover:shadow-hover',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        )}
        aria-label="Open user menu"
      >
        <Avatar.Root className="inline-flex h-full w-full items-center justify-center overflow-hidden rounded-full">
          <Avatar.Fallback delayMs={0} className="text-sm font-semibold">
            {initials}
          </Avatar.Fallback>
        </Avatar.Root>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className={cn(
            'z-50 min-w-[220px] rounded-md bg-surface p-1 shadow-card',
            'data-[side=bottom]:animate-in data-[side=bottom]:fade-in-0 data-[side=bottom]:slide-in-from-top-1',
          )}
        >
          <div className="flex flex-col gap-0.5 px-3 py-2 text-sm">
            <span className="font-semibold text-foreground">{user.email}</span>
            <span className="text-xs text-foreground-muted">Signed in</span>
          </div>

          <DropdownMenu.Separator className="my-1 h-px bg-border" />

          <DropdownMenu.Item
            onSelect={(e) => {
              e.preventDefault();
              void handleSignOut();
            }}
            disabled={isPending}
            className={cn(
              'flex cursor-pointer items-center gap-2 rounded px-3 py-2 text-sm text-foreground',
              'data-[highlighted]:bg-surface-muted data-[highlighted]:outline-none',
              'data-[disabled]:opacity-50',
            )}
          >
            <LogOut size={16} aria-hidden />
            {isPending ? 'Signing out…' : 'Sign out'}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
