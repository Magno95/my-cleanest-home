import { getCleaningDigestScheduleForKind, type CleaningDigestKind } from '@mch/shared';
import { json, runCleaningDigest } from './lib/cleaning-digests.js';

const TIME_ZONE = 'Europe/Rome';

interface NetlifyEventLike {
  headers?: Record<string, string | undefined>;
  queryStringParameters?: Record<string, string | undefined> | null;
  rawUrl?: string;
  url?: string;
}

export async function handler(request: Request | NetlifyEventLike): Promise<Response> {
  const triggerRequest = normalizeTriggerRequest(request);
  const authError = validateRequestSecret(triggerRequest);
  if (authError) return authError;

  const kind = parseDigestKind(triggerRequest.kind ?? 'morning');
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

interface TriggerRequest {
  authorization: string | null;
  kind: string | null;
  querySecret: string | null;
  secretHeader: string | null;
}

function normalizeTriggerRequest(request: Request | NetlifyEventLike): TriggerRequest {
  if (request instanceof Request) {
    const url = new URL(request.url);
    return {
      authorization: request.headers.get('authorization'),
      kind: url.searchParams.get('kind'),
      querySecret: url.searchParams.get('secret'),
      secretHeader: request.headers.get('x-cleaning-digest-secret'),
    };
  }

  const headers = request.headers ?? {};
  const authorization = readHeader(headers, 'authorization');
  const rawUrl = request.rawUrl ?? request.url ?? 'https://local.invalid/';
  const url = new URL(rawUrl);
  const query = request.queryStringParameters ?? {};

  return {
    authorization,
    kind: query.kind ?? url.searchParams.get('kind'),
    querySecret: query.secret ?? url.searchParams.get('secret'),
    secretHeader: readHeader(headers, 'x-cleaning-digest-secret'),
  };
}

function validateRequestSecret(request: TriggerRequest): Response | null {
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

  const bearer = request.authorization?.startsWith('Bearer ')
    ? request.authorization.slice('Bearer '.length)
    : null;
  const provided = bearer ?? request.secretHeader ?? request.querySecret;

  if (provided !== expected) {
    return json({ error: 'unauthorized' }, { status: 401 });
  }

  return null;
}

function readHeader(headers: Record<string, string | undefined>, name: string): string | null {
  const direct = headers[name];
  if (direct) return direct;

  const lowerName = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === lowerName) return value ?? null;
  }

  return null;
}

function parseDigestKind(value: string): CleaningDigestKind | null {
  if (value === 'morning' || value === 'evening') return value;
  return null;
}
