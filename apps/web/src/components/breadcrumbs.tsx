import { Fragment, type ReactNode } from 'react';
import { Link, type LinkProps } from '@tanstack/react-router';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: ReactNode;
  /**
   * When provided, the item is rendered as a Link. The last crumb should
   * typically be rendered as plain text (omit `to`).
   */
  to?: LinkProps['to'];
  params?: LinkProps['params'];
}

/**
 * Compact breadcrumb trail rendered above page headers. Pass the final crumb
 * without a `to` so it renders as plain text (current page).
 */
export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex flex-wrap items-center gap-1 text-sm text-foreground-muted"
    >
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <Fragment key={i}>
            {item.to && !isLast ? (
              <Link
                to={item.to}
                params={item.params}
                className="underline-offset-4 hover:text-foreground hover:underline"
              >
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? 'text-foreground' : undefined}>{item.label}</span>
            )}
            {!isLast ? (
              <ChevronRight size={14} aria-hidden className="text-foreground-faint" />
            ) : null}
          </Fragment>
        );
      })}
    </nav>
  );
}
