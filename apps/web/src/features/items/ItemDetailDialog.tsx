import {
  Button,
  Input,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Spinner,
  cn,
} from '@mch/ui';
import { differenceInCalendarDays, format, isToday, isTomorrow, isYesterday } from 'date-fns';
import {
  History,
  Camera,
  CheckCircle2,
  Clock,
  ImagePlus,
  MapPin,
  Package,
  Sparkles,
  Trash2,
  Wrench,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Field } from '../../components/field.js';
import type { ItemSummary } from './use-items.js';
import type { RoomSummary } from '../rooms/use-rooms.js';
import { MISCELLANEOUS_ROOM_NAME } from '../rooms/miscellaneous-room.js';
import { useReferenceData } from '../reference-data/use-reference-data.js';
import { useItemDetail, type FrequencyUnit } from './use-item-detail.js';
import { useDeleteCleaningHistory } from './use-delete-cleaning-history.js';
import { useMarkItemClean } from './use-mark-item-clean.js';
import { useUpdateItemDetails } from './use-update-item-details.js';

interface ItemDetailDialogProps {
  item: ItemSummary | null;
  rooms: RoomSummary[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Full-width bottom detail sheet for a cleaning item. Supports reference
 * photo upload, cleaning guidance fields, frequency editing, and mark-clean
 * scheduling against real Supabase tables.
 */
export function ItemDetailDialog({ item, rooms, open, onOpenChange }: ItemDetailDialogProps) {
  const room = item?.roomId ? rooms.find((r) => r.id === item.roomId) : null;
  const detailQuery = useItemDetail(item?.id ?? null);
  const referenceDataQuery = useReferenceData();
  const updateItemDetails = useUpdateItemDetails();
  const markItemClean = useMarkItemClean();
  const deleteCleaningHistory = useDeleteCleaningHistory();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [cleaningMethod, setCleaningMethod] = useState('');
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [frequencyValue, setFrequencyValue] = useState('');
  const [frequencyUnit, setFrequencyUnit] = useState<FrequencyUnit | ''>('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [clearPhoto, setClearPhoto] = useState(false);

  const detail = detailQuery.data;
  const referenceData = referenceDataQuery.data;
  const productOptions = referenceData?.products ?? [];
  const toolOptions = referenceData?.tools ?? [];

  useEffect(() => {
    if (!detail || !open) return;
    setCleaningMethod(detail.cleaningMethod ?? '');
    setSelectedTools(detail.cleaningTools);
    setSelectedProducts(detail.cleaningProducts);
    setFrequencyValue(detail.frequencyValue ? String(detail.frequencyValue) : '');
    setFrequencyUnit(detail.frequencyUnit ?? '');
    setPhotoFile(null);
    setClearPhoto(false);
  }, [detail, open]);

  const photoPreviewUrl = useMemo(() => {
    if (!photoFile) return null;
    return URL.createObjectURL(photoFile);
  }, [photoFile]);

  useEffect(() => {
    return () => {
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    };
  }, [photoPreviewUrl]);

  const displayedPhotoUrl = clearPhoto
    ? null
    : (photoPreviewUrl ?? detail?.referencePhotoUrl ?? null);
  const lastCleanedLabel = detail?.lastDoneAt
    ? formatRelativeDayLabel(detail.lastDoneAt, 'past')
    : 'Never marked clean';
  const nextDueLabel = detail?.nextDueAt
    ? formatRelativeDayLabel(detail.nextDueAt, 'future')
    : 'No schedule yet';
  const busy =
    updateItemDetails.isPending || markItemClean.isPending || deleteCleaningHistory.isPending;

  async function handleSave() {
    if (!item) return;

    const parsedFrequencyValue = frequencyValue.trim().length
      ? Number.parseInt(frequencyValue, 10)
      : null;

    if ((frequencyUnit === '') !== (parsedFrequencyValue === null)) {
      toast.error('Set both cleaning frequency value and unit.');
      return;
    }

    if (
      parsedFrequencyValue !== null &&
      (!Number.isInteger(parsedFrequencyValue) || parsedFrequencyValue < 1)
    ) {
      toast.error('Cleaning frequency must be a positive integer.');
      return;
    }

    try {
      await updateItemDetails.mutateAsync({
        itemId: item.id,
        homeId: item.homeId,
        cleaningMethod,
        cleaningTools: selectedTools,
        cleaningProducts: selectedProducts,
        frequencyUnit: frequencyUnit === '' ? null : frequencyUnit,
        frequencyValue: parsedFrequencyValue,
        photoFile,
        clearPhoto,
        currentPhotoPath: detail?.referencePhotoPath ?? null,
      });
      toast.success('Item details saved.');
      setPhotoFile(null);
      setClearPhoto(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save item details.');
    }
  }

  async function handleMarkClean() {
    if (!item) return;
    if (!detail?.frequencyUnit || !detail.frequencyValue) {
      toast.error('Set cleaning frequency first.');
      return;
    }

    try {
      await markItemClean.mutateAsync({ itemId: item.id, homeId: item.homeId });
      toast.success('Item marked clean. Next task scheduled.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to mark item clean.');
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[92vh] rounded-t-[2rem] p-0">
        <div className="flex h-full flex-col">
          <SheetHeader className="border-b border-border px-6 pb-4 pt-6">
            <SheetTitle className="pr-12 text-2xl font-bold tracking-tighter">
              {item?.name ?? 'Item'}
            </SheetTitle>
            <SheetDescription>
              {room ? `In ${room.name}` : 'Not assigned to a room yet'}
            </SheetDescription>
          </SheetHeader>

          {detailQuery.isLoading ? (
            <div className="flex flex-1 items-center justify-center">
              <Spinner size={28} label="Loading item details" />
            </div>
          ) : detailQuery.isError ? (
            <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-foreground-muted">
              Failed to load item details.
            </div>
          ) : detail ? (
            <>
              <div className="flex-1 overflow-y-auto px-6 pb-28 pt-6">
                <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
                  <section className="flex flex-col gap-4">
                    <div className="overflow-hidden rounded-[1.75rem] border border-border bg-surface-muted shadow-card">
                      {displayedPhotoUrl ? (
                        <img
                          src={displayedPhotoUrl}
                          alt={`${detail.name} reference`}
                          className="h-72 w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-72 flex-col items-center justify-center gap-3 bg-gradient-to-br from-brand/10 via-background to-surface-muted text-center">
                          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand/10 text-brand">
                            <Camera size={24} aria-hidden />
                          </span>
                          <div className="space-y-1 px-6">
                            <p className="text-base font-semibold text-foreground">
                              Reference photo
                            </p>
                            <p className="text-sm text-foreground-muted">
                              Add a picture so anybody cleaning this item sees target result.
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-2 border-t border-border bg-background/90 px-4 py-3">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(event) => {
                            const nextFile = event.target.files?.[0] ?? null;
                            setPhotoFile(nextFile);
                            setClearPhoto(false);
                          }}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <ImagePlus size={16} aria-hidden />
                          {displayedPhotoUrl ? 'Replace photo' : 'Upload photo'}
                        </Button>
                        {displayedPhotoUrl ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setPhotoFile(null);
                              setClearPhoto(true);
                            }}
                          >
                            Remove photo
                          </Button>
                        ) : null}
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <MetricCard icon={<MapPin size={16} aria-hidden />} label="Room">
                        {room?.name ?? MISCELLANEOUS_ROOM_NAME}
                      </MetricCard>
                      <MetricCard
                        icon={<CheckCircle2 size={16} aria-hidden />}
                        label="Last cleaned"
                      >
                        {lastCleanedLabel}
                      </MetricCard>
                      <MetricCard icon={<Clock size={16} aria-hidden />} label="Next task">
                        {nextDueLabel}
                      </MetricCard>
                    </div>

                    <div className="rounded-[1.75rem] border border-border bg-background shadow-card">
                      <div className="flex items-center gap-2 border-b border-border px-5 py-4">
                        <History size={16} aria-hidden className="text-brand" />
                        <div>
                          <p className="text-sm font-semibold text-foreground">Cleaning history</p>
                          <p className="text-xs text-foreground-muted">
                            Past cleanings for this item.
                          </p>
                        </div>
                      </div>

                      {detail.cleaningHistory.length === 0 ? (
                        <div className="px-5 py-5 text-sm text-foreground-muted">
                          No past cleanings yet.
                        </div>
                      ) : (
                        <ul className="flex flex-col divide-y divide-border">
                          {detail.cleaningHistory.map((entry) => (
                            <li
                              key={entry.id}
                              className="flex items-center justify-between gap-4 px-5 py-4"
                            >
                              <div className="flex flex-col gap-1">
                                <span className="text-sm font-medium text-foreground">
                                  {formatRelativeDayLabel(entry.completedAt, 'past')}
                                </span>
                                <span className="text-xs text-foreground-muted">
                                  {format(new Date(entry.completedAt), 'MMM d, yyyy')}
                                </span>
                              </div>

                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={busy}
                                onClick={() => {
                                  if (!item) return;

                                  const confirmed = window.confirm(
                                    'Delete this cleaning entry from history?',
                                  );
                                  if (!confirmed) return;

                                  void deleteCleaningHistory
                                    .mutateAsync({
                                      historyTaskId: entry.id,
                                      itemId: item.id,
                                      homeId: item.homeId,
                                    })
                                    .then(() => {
                                      toast.success('Cleaning entry deleted.');
                                    })
                                    .catch((error) => {
                                      toast.error(
                                        error instanceof Error
                                          ? error.message
                                          : 'Failed to delete cleaning entry.',
                                      );
                                    });
                                }}
                              >
                                <Trash2 size={14} aria-hidden />
                                Delete
                              </Button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </section>

                  <section className="flex flex-col gap-4">
                    <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
                      <Field id="item-frequency-value" label="Cleaning frequency">
                        <Input
                          id="item-frequency-value"
                          type="number"
                          min={1}
                          value={frequencyValue}
                          onChange={(event) => setFrequencyValue(event.target.value)}
                          placeholder="e.g. 1"
                        />
                      </Field>
                      <Field id="item-frequency-unit" label="Unit">
                        <select
                          id="item-frequency-unit"
                          value={frequencyUnit}
                          onChange={(event) =>
                            setFrequencyUnit(event.target.value as FrequencyUnit | '')
                          }
                          className={selectClassName}
                        >
                          <option value="">No schedule</option>
                          <option value="day">Day</option>
                          <option value="week">Week</option>
                          <option value="month">Month</option>
                          <option value="year">Year</option>
                        </select>
                      </Field>
                    </div>

                    <Field
                      id="item-cleaning-method"
                      label="Cleaning method"
                      description="Describe step-by-step how to clean this item."
                    >
                      <textarea
                        id="item-cleaning-method"
                        value={cleaningMethod}
                        onChange={(event) => setCleaningMethod(event.target.value)}
                        rows={7}
                        className={textareaClassName}
                        placeholder="Spray surface, wait 2 minutes, wipe with microfiber cloth, dry edges..."
                      />
                    </Field>

                    <Field
                      id="item-cleaning-tools"
                      label="Cleaning tools"
                      description="Select saved tools for this item."
                    >
                      <div className="space-y-2">
                        <SelectionChips
                          emptyLabel="No saved tools yet. Add them in Settings first."
                          options={toolOptions.map((tool) => tool.name)}
                          selectedValues={selectedTools}
                          onToggle={(value) =>
                            setSelectedTools((current) => toggleSelectedValue(current, value))
                          }
                        />
                        <TagPreview
                          icon={<Wrench size={14} aria-hidden />}
                          values={selectedTools}
                        />
                      </div>
                    </Field>

                    <Field
                      id="item-cleaning-products"
                      label="Cleaning products"
                      description="Select saved products for this item."
                    >
                      <div className="space-y-2">
                        <SelectionChips
                          emptyLabel="No saved products yet. Add them in Settings first."
                          options={productOptions.map((product) => product.name)}
                          selectedValues={selectedProducts}
                          onToggle={(value) =>
                            setSelectedProducts((current) => toggleSelectedValue(current, value))
                          }
                        />
                        <TagPreview
                          icon={<Package size={14} aria-hidden />}
                          values={selectedProducts}
                        />
                      </div>
                    </Field>
                  </section>
                </div>
              </div>

              <div className="border-t border-border bg-background/95 px-6 py-4 backdrop-blur">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Button
                    variant="outline"
                    onClick={handleMarkClean}
                    disabled={busy || !detail.frequencyUnit || !detail.frequencyValue}
                  >
                    <Sparkles size={16} aria-hidden />
                    {markItemClean.isPending ? 'Marking clean…' : 'Mark clean'}
                  </Button>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
                      Close
                    </Button>
                    <Button variant="brand" onClick={handleSave} disabled={busy}>
                      {updateItemDetails.isPending ? 'Saving…' : 'Save details'}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

const textareaClassName = cn(
  'min-h-[9rem] w-full rounded-xl border border-border-strong bg-background px-3 py-3 text-[15px] text-foreground',
  'placeholder:text-foreground-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
);

const selectClassName = cn(
  'flex h-11 w-full rounded-md border border-border-strong bg-background px-3 text-[15px] text-foreground',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
);

function splitCommaList(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function toggleSelectedValue(values: string[], value: string) {
  return values.includes(value) ? values.filter((entry) => entry !== value) : [...values, value];
}

function formatRelativeDayLabel(input: string, mode: 'past' | 'future') {
  const date = new Date(input);

  if (isToday(date)) {
    return 'Today';
  }

  if (mode === 'past' && isYesterday(date)) {
    return 'Yesterday';
  }

  if (mode === 'future' && isTomorrow(date)) {
    return 'Tomorrow';
  }

  const diffDays = Math.abs(differenceInCalendarDays(date, new Date()));
  const dateLabel = format(date, 'MMM d, yyyy');

  if (mode === 'past') {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago (${dateLabel})`;
  }

  return `In ${diffDays} day${diffDays === 1 ? '' : 's'} (${dateLabel})`;
}

function MetricCard({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border bg-background px-4 py-3 shadow-card">
      <span className="mt-0.5 text-brand">{icon}</span>
      <div className="flex flex-1 flex-col gap-0.5">
        <span className="text-[11px] font-medium uppercase tracking-wider text-foreground-faint">
          {label}
        </span>
        <span className="text-foreground">{children}</span>
      </div>
    </div>
  );
}

function TagPreview({ icon, values }: { icon: React.ReactNode; values: string[] }) {
  if (values.length === 0) {
    return <p className="text-xs text-foreground-muted">No entries yet.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {values.map((value) => (
        <span
          key={value}
          className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2.5 py-1 text-xs font-medium text-brand"
        >
          {icon}
          {value}
        </span>
      ))}
    </div>
  );
}

function SelectionChips({
  options,
  selectedValues,
  onToggle,
  emptyLabel,
}: {
  options: string[];
  selectedValues: string[];
  onToggle: (value: string) => void;
  emptyLabel: string;
}) {
  const knownValues = new Set(options);
  const legacyValues = selectedValues.filter((value) => !knownValues.has(value));

  if (options.length === 0 && legacyValues.length === 0) {
    return <p className="text-sm text-foreground-muted">{emptyLabel}</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {options.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {options.map((option) => {
            const selected = selectedValues.includes(option);

            return (
              <button
                key={option}
                type="button"
                onClick={() => onToggle(option)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                  selected
                    ? 'border-brand bg-brand/10 text-brand'
                    : 'border-border bg-background text-foreground-muted hover:border-brand/30 hover:text-foreground',
                )}
              >
                {option}
              </button>
            );
          })}
        </div>
      ) : null}

      {legacyValues.length > 0 ? (
        <p className="text-xs text-foreground-muted">
          Existing custom values kept on item: {legacyValues.join(', ')}.
        </p>
      ) : null}
    </div>
  );
}
