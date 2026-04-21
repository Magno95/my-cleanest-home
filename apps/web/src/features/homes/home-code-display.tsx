import { Button } from '@mch/ui';

interface HomeCodeDisplayProps {
  code: string;
  onCopy: () => void;
}

export function HomeCodeDisplay({ code, onCopy }: HomeCodeDisplayProps) {
  return (
    <div className="rounded-xl border border-border bg-surface-muted/40 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground-muted">
        Home code
      </p>
      <div className="mt-2 flex items-center justify-between gap-3">
        <code className="text-sm font-semibold tracking-[0.2em] text-foreground">{code}</code>
        <Button type="button" size="sm" variant="outline" onClick={onCopy}>
          Copy code
        </Button>
      </div>
    </div>
  );
}
