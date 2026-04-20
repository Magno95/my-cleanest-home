import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { Button, Input } from '@mch/ui';
import { Field } from '../../components/field.js';
import { supabase } from '../../lib/supabase.js';
import { signInSchema, type SignInValues } from './schemas.js';

export function SignInForm() {
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    const { error } = await supabase.auth.signInWithPassword(values);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Welcome back!');
    await navigate({ to: '/' });
  });

  const busy = isSubmitting;

  return (
    <form className="flex flex-col gap-5" onSubmit={onSubmit} noValidate>
      <Field id="signin-email" label="Email" error={errors.email?.message}>
        <Input
          id="signin-email"
          type="email"
          autoComplete="email"
          aria-invalid={errors.email ? 'true' : 'false'}
          {...register('email')}
        />
      </Field>

      <Field id="signin-password" label="Password" error={errors.password?.message}>
        <Input
          id="signin-password"
          type="password"
          autoComplete="current-password"
          aria-invalid={errors.password ? 'true' : 'false'}
          {...register('password')}
        />
      </Field>

      <Button type="submit" variant="brand" size="lg" disabled={busy}>
        {busy ? 'Signing in…' : 'Sign in'}
      </Button>

      <p className="text-center text-sm text-foreground-muted">
        Don&apos;t have an account?{' '}
        <Link
          to="/signup"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Create one
        </Link>
      </p>
    </form>
  );
}
