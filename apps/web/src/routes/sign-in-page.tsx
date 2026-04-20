import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@mch/ui';
import { SignInForm } from '../features/auth/SignInForm.js';

export function SignInPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Welcome back. Let&apos;s keep your home sparkling.</CardDescription>
      </CardHeader>
      <CardContent>
        <SignInForm />
      </CardContent>
    </Card>
  );
}
