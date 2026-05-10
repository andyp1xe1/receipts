import type { ParsedReceipt, ReceiptRecord, ReceiptSummary } from '$lib/types';

export const MANUAL_ECC_ID = 'manual';

export function parseReceiptRecord(record: ReceiptRecord): ReceiptSummary {
  return { ...record, parsed: JSON.parse(record.rawJson) as ParsedReceipt };
}

export function isManual(record: { eccId: string }): boolean {
  return record.eccId === MANUAL_ECC_ID;
}
