import { describe, expect, it } from 'vitest';
import { addFrequency, isOverdue, nextDueDate } from './cycle.js';
import type { CleaningCycle } from './types.js';

const cycle = (
  lastDoneAt: string | null,
  unit: 'day' | 'week' | 'month' | 'year',
  value: number,
): CleaningCycle => ({
  id: '00000000-0000-0000-0000-000000000001',
  itemId: '00000000-0000-0000-0000-000000000002',
  frequency: { unit, value },
  lastDoneAt,
});

describe('addFrequency', () => {
  it('adds days', () => {
    const from = new Date('2026-01-01T00:00:00.000Z');
    expect(addFrequency(from, { unit: 'day', value: 3 }).toISOString()).toBe(
      '2026-01-04T00:00:00.000Z',
    );
  });

  it('adds weeks', () => {
    const from = new Date('2026-01-01T00:00:00.000Z');
    expect(addFrequency(from, { unit: 'week', value: 2 }).toISOString()).toBe(
      '2026-01-15T00:00:00.000Z',
    );
  });

  it('adds months (calendar-aware)', () => {
    const from = new Date('2026-01-31T00:00:00.000Z');
    // Feb has no 31st; JS Date normalises to March 3rd (UTC).
    const result = addFrequency(from, { unit: 'month', value: 1 });
    expect(result.getUTCMonth()).toBe(2); // March (0-indexed)
  });

  it('adds years', () => {
    const from = new Date('2026-04-20T00:00:00.000Z');
    expect(addFrequency(from, { unit: 'year', value: 1 }).toISOString()).toBe(
      '2027-04-20T00:00:00.000Z',
    );
  });

  it('rejects non-positive values', () => {
    expect(() => addFrequency(new Date(), { unit: 'day', value: 0 })).toThrow(RangeError);
    expect(() => addFrequency(new Date(), { unit: 'day', value: -1 })).toThrow(RangeError);
  });
});

describe('nextDueDate', () => {
  it('returns now when never completed', () => {
    const now = new Date('2026-04-20T12:00:00.000Z');
    expect(nextDueDate(cycle(null, 'week', 1), now).toISOString()).toBe(now.toISOString());
  });

  it('advances from lastDoneAt by the frequency', () => {
    const c = cycle('2026-04-01T00:00:00.000Z', 'week', 2);
    expect(nextDueDate(c).toISOString()).toBe('2026-04-15T00:00:00.000Z');
  });

  it('throws on invalid lastDoneAt', () => {
    const c = cycle('nope', 'day', 1);
    expect(() => nextDueDate(c)).toThrow(RangeError);
  });
});

describe('isOverdue', () => {
  it('true when due date is in the past', () => {
    const c = cycle('2026-04-01T00:00:00.000Z', 'week', 1);
    const now = new Date('2026-04-20T00:00:00.000Z');
    expect(isOverdue(c, now)).toBe(true);
  });

  it('true exactly at the due date (inclusive)', () => {
    const c = cycle('2026-04-01T00:00:00.000Z', 'week', 1);
    const now = new Date('2026-04-08T00:00:00.000Z');
    expect(isOverdue(c, now)).toBe(true);
  });

  it('false when due in the future', () => {
    const c = cycle('2026-04-20T00:00:00.000Z', 'week', 1);
    const now = new Date('2026-04-21T00:00:00.000Z');
    expect(isOverdue(c, now)).toBe(false);
  });
});
