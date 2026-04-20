import { Outlet } from '@tanstack/react-router';
import { Sparkles } from 'lucide-react';

/** Public chrome used for sign-in / sign-up. Centred card on white canvas. */
export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="mx-auto flex w-full max-w-5xl items-center gap-2 px-6 pt-8 text-foreground">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-brand-foreground">
          <Sparkles size={16} aria-hidden />
        </span>
        <span className="text-base font-semibold tracking-tight">My Cleanest Home</span>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 items-center px-6 py-12">
        <div className="w-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
