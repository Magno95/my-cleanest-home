import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import gsap from 'gsap';
import { X } from 'lucide-react';
import { cn } from '../lib/cn.js';

/**
 * Sheet primitives wrap Radix Dialog and animate the enter transition with
 * GSAP. Radix controls mount/unmount so closed sheets never leave stray
 * overlays blocking pointer events. Default side is `left`, but bottom sheets
 * are supported for mobile/full-width detail surfaces.
 */
export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(function SheetOverlay({ className, ...props }, ref) {
  const localRef = React.useRef<HTMLDivElement | null>(null);
  const setRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      localRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
    },
    [ref],
  );
  React.useLayoutEffect(() => {
    if (localRef.current) {
      gsap.fromTo(
        localRef.current,
        { autoAlpha: 0 },
        { autoAlpha: 1, duration: 0.22, ease: 'power2.out' },
      );
    }
  }, []);
  return (
    <DialogPrimitive.Overlay
      ref={setRef}
      className={cn('fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm', className)}
      {...props}
    />
  );
});

export interface SheetContentProps extends React.ComponentPropsWithoutRef<
  typeof DialogPrimitive.Content
> {
  side?: 'right' | 'left' | 'bottom';
}

export const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  SheetContentProps
>(function SheetContent({ className, children, side = 'left', ...props }, forwardedRef) {
  const contentRef = React.useRef<HTMLDivElement | null>(null);

  const setContentRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      contentRef.current = node;
      if (typeof forwardedRef === 'function') forwardedRef(node);
      else if (forwardedRef)
        (forwardedRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    },
    [forwardedRef],
  );

  const layoutClass =
    side === 'bottom'
      ? 'fixed bottom-0 left-0 right-0 z-50 flex w-full flex-col gap-4 border-t border-border bg-background shadow-card will-change-transform'
      : cn(
          'fixed top-0 z-50 flex h-full w-full max-w-md flex-col gap-4 border-border bg-background p-6 shadow-card will-change-transform',
          side === 'right' ? 'right-0 border-l' : 'left-0 border-r',
        );

  React.useLayoutEffect(() => {
    if (!contentRef.current) return;

    if (side === 'bottom') {
      gsap.fromTo(
        contentRef.current,
        { autoAlpha: 0, y: '100%' },
        { autoAlpha: 1, y: '0%', duration: 0.38, ease: 'power3.out' },
      );
      return;
    }

    gsap.fromTo(
      contentRef.current,
      { autoAlpha: 0, x: side === 'right' ? '100%' : '-100%' },
      { autoAlpha: 1, x: '0%', duration: 0.35, ease: 'power3.out' },
    );
  }, [side]);

  return (
    <DialogPrimitive.Portal>
      <SheetOverlay />
      <DialogPrimitive.Content
        ref={setContentRef}
        className={cn(layoutClass, className)}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          className="absolute right-4 top-4 rounded-sm text-foreground-muted opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
          aria-label="Close"
        >
          <X size={18} aria-hidden />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
});

export function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1.5', className)} {...props} />;
}

export const SheetTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(function SheetTitle({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Title
      ref={ref}
      className={cn('text-xl font-bold tracking-tight text-foreground', className)}
      {...props}
    />
  );
});

export const SheetDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(function SheetDescription({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Description
      ref={ref}
      className={cn('text-sm text-foreground-muted', className)}
      {...props}
    />
  );
});
