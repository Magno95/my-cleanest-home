import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@mch/ui';
import { HomesList } from '../features/homes/HomesList.js';

/**
 * Profile placeholder: will host account settings, but for now exposes the
 * homes list + create form (previously on the landing page). Home switching
 * UI lands in the next slice.
 */
export function ProfilePage() {
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tighter text-foreground">Profile</h1>
        <p className="text-sm text-foreground-muted">Manage your homes and account settings.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Homes</CardTitle>
          <CardDescription>
            Create additional homes or open an existing one to manage rooms.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <HomesList />
        </CardContent>
      </Card>
    </div>
  );
}
