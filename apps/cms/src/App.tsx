import { Button } from '@mch/ui';

export function App(): JSX.Element {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background text-foreground">
      <h1 className="text-3xl font-semibold">My Cleanest Home — CMS</h1>
      <p className="text-muted-foreground">Admin console — scaffold ready.</p>
      <Button variant="outline">Manage catalogue</Button>
    </main>
  );
}
