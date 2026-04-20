import type { HTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../lib/cn.js';

export interface SpinnerProps extends HTMLAttributes<HTMLDivElement> {
  /** Visual size in px. Defaults to 20. */
  size?: number;
  /** Accessible label; defaults to "Loading". */
  label?: string;
}

/**
 * Animated loading indicator. The Vercel React guide recommends animating a
 * wrapper rather than the SVG element itself to enable GPU acceleration, so
 * `animate-spin` is applied on the surrounding div.
 */
export function Spinner({ size = 20, label = 'Loading', className, ...props }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn('inline-flex animate-spin text-foreground-muted', className)}
      {...props}
    >
      <Loader2 width={size} height={size} aria-hidden />
      <span className="sr-only">{label}</span>
    </div>
  );
}
