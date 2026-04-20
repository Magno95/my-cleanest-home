import type { CleaningCycle, Frequency, ISODateString } from './types.js';

/**
 * Returns a new Date advanced by the given frequency.
 * Calendar-aware for month/year units (uses UTC date arithmetic).
 */
export function addFrequency(from: Date, frequency: Frequency): Date {
  if (!Number.isInteger(frequency.value) || frequency.value <= 0) {
    throw new RangeError('Frequency value must be a positive integer');
  }

  const d = new Date(from.getTime());
  switch (frequency.unit) {
    case 'day':
      d.setUTCDate(d.getUTCDate() + frequency.value);
      return d;
    case 'week':
      d.setUTCDate(d.getUTCDate() + frequency.value * 7);
      return d;
    case 'month':
      d.setUTCMonth(d.getUTCMonth() + frequency.value);
      return d;
    case 'year':
      d.setUTCFullYear(d.getUTCFullYear() + frequency.value);
      return d;
  }
}

/**
 * Given a cleaning cycle and the reference "now", returns when the next
 * task should be due. If the cycle was never completed, it is due immediately
 * at `now` (the caller typically stores this as the first due date at creation
 * time).
 */
export function nextDueDate(cycle: CleaningCycle, now: Date = new Date()): Date {
  if (cycle.lastDoneAt === null) {
    return new Date(now.getTime());
  }
  const last = new Date(cycle.lastDoneAt);
  if (Number.isNaN(last.getTime())) {
    throw new RangeError('cycle.lastDoneAt is not a valid ISO date');
  }
  return addFrequency(last, cycle.frequency);
}

/** True when the cycle's next due date is on or before `now`. */
export function isOverdue(cycle: CleaningCycle, now: Date = new Date()): boolean {
  return nextDueDate(cycle, now).getTime() <= now.getTime();
}

/** Canonical ISO string helper so the server and client agree on format. */
export function toISODateString(d: Date): ISODateString {
  return d.toISOString();
}
