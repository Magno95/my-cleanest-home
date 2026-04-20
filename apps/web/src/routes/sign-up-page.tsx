import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@mch/ui';
import { SignUpForm } from '../features/auth/SignUpForm.js';

export function SignUpPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>
          Build the map of your home and never forget a chore again.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SignUpForm />
      </CardContent>
    </Card>
  );
}
