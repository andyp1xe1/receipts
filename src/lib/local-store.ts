import type { ParsedReceipt, ReceiptRecord } from '$lib/types';

const STORAGE_KEY = 'receipts.records.v1';

type ReceiptMap = Record<string, ReceiptRecord>;

let cache: ReceiptMap | null = null;
const subscribers = new Set<() => void>();

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== null && event.key !== STORAGE_KEY) return;
    cache = null;
    for (const cb of subscribers) cb();
  });
}

function read(): ReceiptMap {
  if (cache !== null) return cache;
  if (typeof localStorage === 'undefined') return {};
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    cache = {};
    return cache;
  }
  try {
    cache = JSON.parse(raw) as ReceiptMap;
  } catch {
    cache = {};
  }
  return cache;
}

function write(map: ReceiptMap): void {
  cache = map;
  if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

function compareDesc(a: ReceiptRecord, b: ReceiptRecord): number {
  if (a.urlDate !== b.urlDate) return a.urlDate < b.urlDate ? 1 : -1;
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
  return 0;
}

export interface LocalReceiptMetadata {
  category: string | null;
  note: string | null;
}

export function list(): ReceiptRecord[] {
  return Object.values(read()).sort(compareDesc);
}

export function get(id: string): ReceiptRecord | null {
  return read()[id] ?? null;
}

export function findByCanonicalKey(receipt: ParsedReceipt): ReceiptRecord | null {
  for (const record of Object.values(read())) {
    if (
      record.eccId === receipt.eccId &&
      record.urlTotal === receipt.urlTotal &&
      record.urlReceiptNumber === receipt.urlReceiptNumber &&
      record.urlDate === receipt.urlDate
    ) {
      return record;
    }
  }
  return null;
}

export function create(receipt: ParsedReceipt, metadata: LocalReceiptMetadata): string {
  const id = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  const record: ReceiptRecord = {
    id,
    sourceUrl: receipt.sourceUrl,
    eccId: receipt.eccId,
    urlTotal: receipt.urlTotal,
    urlReceiptNumber: receipt.urlReceiptNumber,
    urlDate: receipt.urlDate,
    merchantName: receipt.merchant.name,
    merchantTaxId: receipt.merchant.taxId,
    issuedAt: receipt.issuedAt,
    total: receipt.total,
    category: metadata.category,
    note: metadata.note,
    rawJson: JSON.stringify(receipt),
    createdAt: timestamp,
    updatedAt: timestamp
  };
  const map = read();
  map[id] = record;
  write(map);
  return id;
}

export function updateMetadata(id: string, metadata: LocalReceiptMetadata): void {
  const map = read();
  const existing = map[id];
  if (!existing) return;
  map[id] = {
    ...existing,
    category: metadata.category,
    note: metadata.note,
    updatedAt: new Date().toISOString()
  };
  write(map);
}

export function remove(id: string): void {
  const map = read();
  if (!(id in map)) return;
  delete map[id];
  write(map);
}

export function onChange(callback: () => void): () => void {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}
