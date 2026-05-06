/* global console, fetch, process */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const validKinds = new Set(['morning', 'evening']);
const kind = process.argv[2] ?? 'morning';

if (!validKinds.has(kind)) {
  console.error('Usage: pnpm email:digest:morning or pnpm email:digest:evening');
  process.exit(1);
}

loadLocalEnv();

const appBaseUrl = readRequiredEnv('APP_BASE_URL').replace(/\/+$/, '');
const secret = readRequiredEnv('CLEANING_DIGEST_TRIGGER_SECRET');
const url = `${appBaseUrl}/.netlify/functions/trigger-cleaning-digest?kind=${kind}`;

const response = await fetch(url, {
  headers: {
    Authorization: `Bearer ${secret}`,
  },
});

const text = await response.text();
let body = text;

try {
  body = JSON.stringify(JSON.parse(text), null, 2);
} catch {
  // Keep non-JSON responses readable.
}

console.log(body);

if (!response.ok) {
  process.exit(1);
}

function loadLocalEnv() {
  const envPath = resolve(process.cwd(), '.env.local');
  if (!existsSync(envPath)) return;

  const file = readFileSync(envPath, 'utf8');
  for (const rawLine of file.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    const value = unquote(line.slice(separatorIndex + 1).trim());
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function readRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing ${name}. Add it to .env.local or pass it in the shell.`);
    process.exit(1);
  }
  return value;
}

function unquote(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}
