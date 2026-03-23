import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export type PrivateReceiptEntry = {
  source_url: string;
  kind?: 'four_part' | 'opaque_lookup';
};

const DEFAULT_PRIVATE_PATHS = [
  'tests/private/receipt_urls.json',
  'tests/private/receipt_urls.local.json'
];

function isReceiptEntry(value: unknown): value is PrivateReceiptEntry {
  if (!value || typeof value !== 'object') return false;

  const entry = value as Record<string, unknown>;
  const kind = entry.kind;
  return (
    typeof entry.source_url === 'string' &&
    (kind === undefined || kind === 'four_part' || kind === 'opaque_lookup')
  );
}

export function loadPrivateReceiptCorpus(): PrivateReceiptEntry[] | null {
  const envPath = process.env.MEV_PRIVATE_RECEIPT_LIST;
  const candidatePaths = envPath ? [envPath, ...DEFAULT_PRIVATE_PATHS] : DEFAULT_PRIVATE_PATHS;

  for (const candidatePath of candidatePaths) {
    const resolvedPath = resolve(candidatePath);
    if (!existsSync(resolvedPath)) continue;

    const payload = JSON.parse(readFileSync(resolvedPath, 'utf8')) as unknown;
    if (!Array.isArray(payload)) {
      throw new Error(`Private receipt list must be a JSON array: ${resolvedPath}`);
    }
    if (!payload.every(isReceiptEntry)) {
      throw new Error(`Private receipt list has an invalid entry: ${resolvedPath}`);
    }

    return payload;
  }

  return null;
}
