import { getCleaningDigestScheduleForKind, type CleaningDigestKind } from '@mch/shared';
import { json, runCleaningDigest } from './lib/cleaning-digests.js';

const TIME_ZONE = 'Europe/Rome';

export default async function handler(request: Request): Promise<Response> {
  const authError = validateRequestSecret(request);
  if (authError) return authError;

  const url = new URL(request.url);
  const kind = parseDigestKind(url.searchParams.get('kind') ?? 'morning');
  if (!kind) {
    return json(
      {
        error: 'invalid_kind',
        message: 'Use kind=morning or kind=evening.',
      },
      { status: 400 },
    );
  }

  const schedule = getCleaningDigestScheduleForKind(kind, new Date(), TIME_ZONE);
  const result = await runCleaningDigest(schedule, { recordDelivery: false });

  return json({
    manual: true,
    ...result,
  });
}

function validateRequestSecret(request: Request): Response | null {
  const expected = process.env.CLEANING_DIGEST_TRIGGER_SECRET;
  if (!expected) {
    return json(
      {
        error: 'missing_trigger_secret',
        message: 'Set CLEANING_DIGEST_TRIGGER_SECRET in Netlify before using this function.',
      },
      { status: 500 },
    );
  }

  const url = new URL(request.url);
  const authorization = request.headers.get('authorization');
  const bearer = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : null;
  const provided =
    bearer ?? request.headers.get('x-cleaning-digest-secret') ?? url.searchParams.get('secret');

  if (provided !== expected) {
    return json({ error: 'unauthorized' }, { status: 401 });
  }

  return null;
}

function parseDigestKind(value: string): CleaningDigestKind | null {
  if (value === 'morning' || value === 'evening') return value;
  return null;
}
