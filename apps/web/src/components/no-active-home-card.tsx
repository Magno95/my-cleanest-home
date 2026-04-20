import { Link } from '@tanstack/react-router';
import { Home, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@mch/ui';
import { useCreateDemoHome } from '../features/bootstrap/use-create-demo-home.js';

interface NoActiveHomeCardProps {
  description?: string;
}

export function NoActiveHomeCard({
  description = 'Create a home to start scheduling cleaning tasks.',
}: NoActiveHomeCardProps) {
  const createDemoHome = useCreateDemoHome();

  const handleQuickCreate = async () => {
    try {
      await createDemoHome.mutateAsync();
      toast.success('Demo home created.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create demo home');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand/10 text-brand">
          <Home size={18} aria-hidden />
        </div>
        <CardTitle>No active home</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button variant="brand" onClick={handleQuickCreate} disabled={createDemoHome.isPending}>
          <Plus size={16} aria-hidden />
          {createDemoHome.isPending ? 'Creating…' : 'Create demo home'}
        </Button>
        <Button asChild variant="outline">
          <Link to="/profile">Open profile</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
