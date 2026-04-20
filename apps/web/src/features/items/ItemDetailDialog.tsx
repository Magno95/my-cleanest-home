import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@mch/ui';
import { Camera, Clock, MapPin } from 'lucide-react';
import type { ItemSummary } from './use-items.js';
import type { RoomSummary } from '../rooms/use-rooms.js';

interface ItemDetailDialogProps {
  item: ItemSummary | null;
  rooms: RoomSummary[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Detail sheet for a cleaning item. Photo and frequency fields are
 * placeholders until the full item-editing slice lands.
 */
export function ItemDetailDialog({ item, rooms, open, onOpenChange }: ItemDetailDialogProps) {
  const room = item?.roomId ? rooms.find((r) => r.id === item.roomId) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item?.name ?? 'Item'}</DialogTitle>
          <DialogDescription>
            {room ? `In ${room.name}` : 'Not assigned to a room yet'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 text-sm">
          <DetailRow icon={<MapPin size={16} aria-hidden />} label="Room">
            {room?.name ?? '—'}
          </DetailRow>
          <DetailRow icon={<Clock size={16} aria-hidden />} label="Cleaning frequency">
            <span className="text-foreground-muted">Not set yet</span>
          </DetailRow>
          <DetailRow icon={<Camera size={16} aria-hidden />} label="Photo">
            <span className="text-foreground-muted">None uploaded</span>
          </DetailRow>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" disabled>
            Edit details
          </Button>
          <Button variant="brand" disabled>
            Mark clean
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-border bg-background px-3 py-2.5">
      <span className="mt-0.5 text-foreground-muted">{icon}</span>
      <div className="flex flex-1 flex-col gap-0.5">
        <span className="text-[11px] font-medium uppercase tracking-wider text-foreground-faint">
          {label}
        </span>
        <span className="text-foreground">{children}</span>
      </div>
    </div>
  );
}
