/**
 * Shared Tailwind preset (Airbnb-inspired).
 *
 * Consumed by `apps/web` and `apps/cms`:
 *   presets: [require('@mch/ui/tailwind-preset')]
 *
 * Tokens come from CSS variables declared in `@mch/ui/styles.css`. Colours
 * use the `hsl(var(--token) / <alpha-value>)` shape so Tailwind opacity
 * modifiers (`bg-brand/80`) keep working.
 */

/** @type {import('tailwindcss').Config} */
export default {
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background) / <alpha-value>)',
        foreground: 'hsl(var(--foreground) / <alpha-value>)',
        'foreground-muted': 'hsl(var(--foreground-muted) / <alpha-value>)',
        'foreground-faint': 'hsl(var(--foreground-faint) / <alpha-value>)',
        surface: {
          DEFAULT: 'hsl(var(--surface-elevated) / <alpha-value>)',
          muted: 'hsl(var(--surface-muted) / <alpha-value>)',
        },
        border: {
          DEFAULT: 'hsl(var(--border) / <alpha-value>)',
          strong: 'hsl(var(--border-strong) / <alpha-value>)',
        },
        ring: 'hsl(var(--ring) / <alpha-value>)',
        brand: {
          DEFAULT: 'hsl(var(--brand) / <alpha-value>)',
          foreground: 'hsl(var(--brand-foreground) / <alpha-value>)',
          active: 'hsl(var(--brand-active) / <alpha-value>)',
        },
        error: {
          DEFAULT: 'hsl(var(--error) / <alpha-value>)',
          foreground: 'hsl(var(--error-foreground) / <alpha-value>)',
        },
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        hover: 'var(--shadow-hover)',
      },
      fontFamily: {
        sans: 'var(--font-sans)',
      },
      letterSpacing: {
        tightest: '-0.44px',
        tighter: '-0.18px',
      },
    },
  },
  plugins: [],
};
