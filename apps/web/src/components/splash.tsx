import { Spinner } from '@mch/ui';

/** Full-viewport loader shown while the initial Supabase session resolves. */
export function Splash() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Spinner size={28} label="Loading My Cleanest Home" />
    </div>
  );
}
