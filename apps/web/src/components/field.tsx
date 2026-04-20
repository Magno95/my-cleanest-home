import { forwardRef, type ReactNode } from 'react';
import { Label } from '@mch/ui';
import { cn } from '@mch/ui';

export interface FieldProps {
  /** Form-field id; wires label ↔ input ↔ description ↔ error. */
  id: string;
  label: string;
  /** Optional helper text rendered below the input. */
  description?: string;
  /** Form error message, if any. */
  error?: string;
  className?: string;
  children: ReactNode;
}

/**
 * Thin composition wrapper around label + control + (description | error).
 * Keeps form fields visually aligned and announces errors to AT via
 * aria-describedby + aria-invalid on the child input.
 *
 * Pass the matching `id` prop to the child control so the label clicks
 * through and screen readers read the error association.
 */
export const Field = forwardRef<HTMLDivElement, FieldProps>(
  ({ id, label, description, error, className, children }, ref) => {
    const descriptionId = description ? `${id}-description` : undefined;
    const errorId = error ? `${id}-error` : undefined;

    return (
      <div ref={ref} className={cn('flex flex-col gap-1.5', className)}>
        <Label htmlFor={id}>{label}</Label>
        {children}
        {description && !error ? (
          <p id={descriptionId} className="text-xs text-foreground-muted">
            {description}
          </p>
        ) : null}
        {error ? (
          <p id={errorId} role="alert" className="text-xs font-medium text-error">
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);
Field.displayName = 'Field';
