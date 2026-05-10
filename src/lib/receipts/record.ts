import type { ParsedReceipt, ReceiptRecord, ReceiptSummary } from '$lib/types';

export function parseReceiptRecord(record: ReceiptRecord): ReceiptSummary {
  return { ...record, parsed: JSON.parse(record.rawJson) as ParsedReceipt };
}
