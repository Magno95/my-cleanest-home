import { getCleaningDigestSchedule } from '@mch/shared';
import { json, runCleaningDigest, type NetlifyJsonResponse } from './lib/cleaning-digests.js';

const TIME_ZONE = 'Europe/Rome';

export const config = {
  schedule: '0 7,8,19,20 * * *',
};

export async function handler(): Promise<NetlifyJsonResponse> {
  const schedule = getCleaningDigestSchedule(new Date(), TIME_ZONE);
  if (!schedule) {
    return json({ skipped: true, reason: 'outside_digest_hour' });
  }

  return json(await runCleaningDigest(schedule, { recordDelivery: true }));
}
