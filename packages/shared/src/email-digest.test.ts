import { describe, expect, it } from 'vitest';
import {
  buildCleaningDigestEmail,
  countDigestTasks,
  getCleaningDigestSchedule,
  getCleaningDigestScheduleForKind,
  type CleaningDigestSection,
} from './email-digest.js';

describe('getCleaningDigestSchedule', () => {
  it('classifies the 09:00 Europe/Rome winter run', () => {
    const schedule = getCleaningDigestSchedule(new Date('2026-01-15T08:00:00.000Z'));

    expect(schedule).toEqual({
      kind: 'morning',
      digestDate: '2026-01-15',
      cutoffIso: '2026-01-15T23:00:00.000Z',
    });
  });

  it('classifies the 09:00 Europe/Rome summer run', () => {
    const schedule = getCleaningDigestSchedule(new Date('2026-07-15T07:00:00.000Z'));

    expect(schedule).toEqual({
      kind: 'morning',
      digestDate: '2026-07-15',
      cutoffIso: '2026-07-15T22:00:00.000Z',
    });
  });

  it('classifies the 21:00 Europe/Rome run', () => {
    const schedule = getCleaningDigestSchedule(new Date('2026-07-15T19:00:00.000Z'));

    expect(schedule?.kind).toBe('evening');
    expect(schedule?.digestDate).toBe('2026-07-15');
  });

  it('returns null outside digest hours', () => {
    expect(getCleaningDigestSchedule(new Date('2026-07-15T10:00:00.000Z'))).toBeNull();
  });

  it('builds a forced schedule outside digest hours', () => {
    expect(
      getCleaningDigestScheduleForKind('evening', new Date('2026-07-15T10:00:00.000Z')),
    ).toEqual({
      kind: 'evening',
      digestDate: '2026-07-15',
      cutoffIso: '2026-07-15T22:00:00.000Z',
    });
  });
});

describe('buildCleaningDigestEmail', () => {
  const sections: CleaningDigestSection[] = [
    {
      homeId: 'home-1',
      homeName: 'Casa <Roma>',
      tasks: [
        {
          homeId: 'home-1',
          homeName: 'Casa <Roma>',
          roomName: 'Bagno & doccia',
          itemName: 'Lavandino "ospiti"',
          dueAt: '2026-05-06T08:00:00.000Z',
        },
      ],
    },
  ];

  it('counts tasks across sections', () => {
    expect(countDigestTasks(sections)).toBe(1);
  });

  it('renders styled html and a plain text fallback', () => {
    const email = buildCleaningDigestEmail({
      kind: 'morning',
      digestDate: '2026-05-06',
      appBaseUrl: 'https://example.com',
      sections,
    });

    expect(email.subject).toBe('Pulizie di oggi: 1 attività');
    expect(email.html).toContain('<!doctype html>');
    expect(email.html).toContain('background:#f6f4ef');
    expect(email.html).toContain('Casa &lt;Roma&gt;');
    expect(email.html).toContain('Bagno &amp; doccia');
    expect(email.html).toContain('Lavandino &quot;ospiti&quot;');
    expect(email.text).toContain('Casa <Roma>');
    expect(email.text).toContain("Apri l'app: https://example.com");
  });
});
