import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn.js';

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium',
    'transition-[background-color,color,box-shadow,transform] duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
  ].join(' '),
  {
    variants: {
      variant: {
        /** Near-black button used for primary navigation / dialogs. */
        default: 'bg-foreground text-background hover:bg-foreground/90 active:scale-[0.98]',
        /** Rausch-red brand CTA. Use sparingly — reserved for conversion actions. */
        brand:
          'bg-brand text-brand-foreground hover:bg-brand-active active:bg-brand-active active:scale-[0.98]',
        /** Outlined on white — secondary actions. */
        outline: 'border border-border-strong bg-background text-foreground hover:bg-surface-muted',
        /** Transparent, for tertiary actions inside dense UIs. */
        ghost: 'bg-transparent text-foreground hover:bg-surface-muted',
        /** Destructive flows only. */
        destructive: 'bg-error text-error-foreground hover:bg-error/90 active:scale-[0.98]',
        /** Link-like inline action. */
        link: 'bg-transparent text-foreground underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-9 rounded px-3 text-sm',
        md: 'h-11 rounded px-5 text-[15px]',
        lg: 'h-12 rounded-md px-6 text-base',
        icon: 'h-10 w-10 rounded-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  /** When true, render into the child element instead of a native `<button>`. */
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, type, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        // Native <button> defaults to type="submit" inside forms; force "button"
        // unless callers explicitly ask for submit/reset.
        type={asChild ? undefined : (type ?? 'button')}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { buttonVariants };
