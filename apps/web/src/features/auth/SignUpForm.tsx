import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { Button, Input } from '@mch/ui';
import { Field } from '../../components/field.js';
import { supabase } from '../../lib/supabase.js';
import { signUpSchema, type SignUpValues } from './schemas.js';

export function SignUpForm() {
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      toast.error(error.message);
      return;
    }
    // With email confirmations disabled in local dev the session is issued
    // immediately. With confirmations enabled, session is null until the
    // user clicks the confirmation link (available in Mailpit locally).
    if (data.session) {
      toast.success('Account created — welcome!');
      await navigate({ to: '/' });
    } else {
      toast.success('Check your email to confirm your account.');
      await navigate({ to: '/signin' });
    }
  });

  const busy = isSubmitting;

  return (
    <form className="flex flex-col gap-5" onSubmit={onSubmit} noValidate>
      <Field id="signup-email" label="Email" error={errors.email?.message}>
        <Input
          id="signup-email"
          type="email"
          autoComplete="email"
          aria-invalid={errors.email ? 'true' : 'false'}
          {...register('email')}
        />
      </Field>

      <Field
        id="signup-password"
        label="Password"
        description="At least 8 characters"
        error={errors.password?.message}
      >
        <Input
          id="signup-password"
          type="password"
          autoComplete="new-password"
          aria-invalid={errors.password ? 'true' : 'false'}
          {...register('password')}
        />
      </Field>

      <Field
        id="signup-confirm-password"
        label="Confirm password"
        error={errors.confirmPassword?.message}
      >
        <Input
          id="signup-confirm-password"
          type="password"
          autoComplete="new-password"
          aria-invalid={errors.confirmPassword ? 'true' : 'false'}
          {...register('confirmPassword')}
        />
      </Field>

      <Button type="submit" variant="brand" size="lg" disabled={busy}>
        {busy ? 'Creating account…' : 'Create account'}
      </Button>

      <p className="text-center text-sm text-foreground-muted">
        Already have an account?{' '}
        <Link
          to="/signin"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
