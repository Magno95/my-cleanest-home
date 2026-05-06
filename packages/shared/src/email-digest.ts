export type CleaningDigestKind = 'morning' | 'evening';

export interface CleaningDigestSchedule {
  kind: CleaningDigestKind;
  digestDate: string;
  cutoffIso: string;
}

export interface CleaningDigestTask {
  homeId: string;
  homeName: string;
  roomName: string | null;
  itemName: string;
  dueAt: string;
}

export interface CleaningDigestSection {
  homeId: string;
  homeName: string;
  tasks: CleaningDigestTask[];
}

export interface CleaningDigestEmailInput {
  kind: CleaningDigestKind;
  digestDate: string;
  appBaseUrl: string;
  sections: CleaningDigestSection[];
}

export interface CleaningDigestEmail {
  subject: string;
  html: string;
  text: string;
}

interface ZonedDateTimeParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const DEFAULT_TIME_ZONE = 'Europe/Rome';
const DIGEST_HOURS: Record<number, CleaningDigestKind> = {
  9: 'morning',
  21: 'evening',
};

const MONTH_NAMES_IT = [
  'gennaio',
  'febbraio',
  'marzo',
  'aprile',
  'maggio',
  'giugno',
  'luglio',
  'agosto',
  'settembre',
  'ottobre',
  'novembre',
  'dicembre',
];

export function getCleaningDigestSchedule(
  now: Date = new Date(),
  timeZone = DEFAULT_TIME_ZONE,
): CleaningDigestSchedule | null {
  const local = getZonedDateTimeParts(now, timeZone);
  const kind = DIGEST_HOURS[local.hour];
  if (!kind) return null;

  return getCleaningDigestScheduleForKind(kind, now, timeZone);
}

export function getCleaningDigestScheduleForKind(
  kind: CleaningDigestKind,
  now: Date = new Date(),
  timeZone = DEFAULT_TIME_ZONE,
): CleaningDigestSchedule {
  const local = getZonedDateTimeParts(now, timeZone);
  const nextDay = addDaysToLocalDate(local, 1);
  const cutoff = zonedLocalTimeToUtc(
    {
      year: nextDay.year,
      month: nextDay.month,
      day: nextDay.day,
      hour: 0,
      minute: 0,
      second: 0,
    },
    timeZone,
  );

  return {
    kind,
    digestDate: toLocalDateString(local),
    cutoffIso: cutoff.toISOString(),
  };
}

export function countDigestTasks(sections: CleaningDigestSection[]): number {
  return sections.reduce((count, section) => count + section.tasks.length, 0);
}

export function buildCleaningDigestEmail(input: CleaningDigestEmailInput): CleaningDigestEmail {
  const taskCount = countDigestTasks(input.sections);
  const formattedDate = formatItalianDate(input.digestDate);
  const subject =
    input.kind === 'morning'
      ? `Pulizie di oggi: ${taskCount} ${taskLabel(taskCount)}`
      : `Promemoria pulizie: ${taskCount} ${taskLabel(taskCount)} ancora da fare`;
  const intro =
    input.kind === 'morning'
      ? `Ecco il riepilogo delle pulizie da fare entro oggi, ${formattedDate}.`
      : `Queste pulizie risultano ancora da fare per oggi, ${formattedDate}.`;

  const sectionHtml = input.sections.map(renderSectionHtml).join('');
  const sectionText = input.sections.map(renderSectionText).join('\n');
  const safeAppUrl = escapeHtml(input.appBaseUrl);

  return {
    subject,
    html: `<!doctype html>
<html lang="it">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;background:#f6f4ef;color:#1f2933;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;color:transparent;">${escapeHtml(intro)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f4ef;margin:0;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #e4dfd6;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="padding:24px 24px 18px;border-bottom:1px solid #ece7df;">
                <div style="font-size:13px;font-weight:700;letter-spacing:0;text-transform:uppercase;color:#6b7280;">My Cleanest Home</div>
                <h1 style="margin:8px 0 8px;font-size:24px;line-height:1.2;color:#111827;">${escapeHtml(subject)}</h1>
                <p style="margin:0;font-size:15px;line-height:1.6;color:#4b5563;">${escapeHtml(intro)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 24px 8px;">
                ${sectionHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:8px 24px 28px;">
                <a href="${safeAppUrl}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;border-radius:8px;padding:12px 16px;">Apri l'app</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
    text: `${subject}

${intro}

${sectionText}
Apri l'app: ${input.appBaseUrl}`,
  };
}

function renderSectionHtml(section: CleaningDigestSection): string {
  const rows = section.tasks
    .map((task) => {
      const room = task.roomName ?? 'Senza stanza';
      return `<tr>
        <td style="padding:12px 0;border-top:1px solid #f0ebe4;">
          <div style="font-size:15px;font-weight:700;line-height:1.4;color:#111827;">${escapeHtml(task.itemName)}</div>
          <div style="margin-top:2px;font-size:13px;line-height:1.4;color:#6b7280;">${escapeHtml(room)}</div>
        </td>
      </tr>`;
    })
    .join('');

  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 18px;border:1px solid #ece7df;border-radius:8px;border-collapse:separate;overflow:hidden;">
    <tr>
      <td style="padding:14px 16px;background:#fbfaf7;">
        <div style="font-size:16px;font-weight:800;color:#111827;">${escapeHtml(section.homeName)}</div>
        <div style="margin-top:2px;font-size:13px;color:#6b7280;">${section.tasks.length} ${escapeHtml(taskLabel(section.tasks.length))}</div>
      </td>
    </tr>
    <tr>
      <td style="padding:0 16px 2px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          ${rows}
        </table>
      </td>
    </tr>
  </table>`;
}

function renderSectionText(section: CleaningDigestSection): string {
  const tasks = section.tasks
    .map((task) => `- ${task.roomName ?? 'Senza stanza'}: ${task.itemName}`)
    .join('\n');
  return `${section.homeName}
${tasks}
`;
}

function taskLabel(count: number): string {
  return count === 1 ? 'attività' : 'attività';
}

function formatItalianDate(date: string): string {
  const [yearText, monthText, dayText] = date.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const monthName = MONTH_NAMES_IT[month - 1] ?? '';
  return `${day} ${monthName} ${year}`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getZonedDateTimeParts(date: Date, timeZone: string): ZonedDateTimeParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });

  const parts = formatter.formatToParts(date).reduce<Record<string, string>>((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

function addDaysToLocalDate(parts: ZonedDateTimeParts, days: number): ZonedDateTimeParts {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days, 0, 0, 0));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: 0,
    minute: 0,
    second: 0,
  };
}

function toLocalDateString(parts: ZonedDateTimeParts): string {
  return [
    String(parts.year).padStart(4, '0'),
    String(parts.month).padStart(2, '0'),
    String(parts.day).padStart(2, '0'),
  ].join('-');
}

function zonedLocalTimeToUtc(parts: ZonedDateTimeParts, timeZone: string): Date {
  const target = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  let guess = new Date(target);

  for (let i = 0; i < 5; i += 1) {
    const actual = getZonedDateTimeParts(guess, timeZone);
    const actualAsUtc = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
      actual.second,
    );
    const diff = target - actualAsUtc;
    if (diff === 0) return guess;
    guess = new Date(guess.getTime() + diff);
  }

  return guess;
}
