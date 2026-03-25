import { and, eq, gte, lte, sql, sum, type SQL } from 'drizzle-orm';
import type { ParsedReceipt, ReceiptRecord, ReceiptSummary } from '$lib/types';
import { receipts } from './schema';

export interface ReceiptFilters {
  month?: string | null;
  category?: string | null;
  from?: string | null;
  to?: string | null;
}

export const nonEmptyCategoryExpr = sql<string>`coalesce(nullif(${receipts.category}, ''), 'Unsorted')`;
export const monthExpr = sql<string>`substr(${receipts.urlDate}, 1, 7)`;
export const categorySortExpr = sql`${nonEmptyCategoryExpr} collate nocase`;

export function totalExpr() {
  return sql<number>`coalesce(cast(${sum(receipts.total)} as real), 0)`
}

export function parseReceiptRecord(record: ReceiptRecord): ReceiptSummary {
  return {
    ...record,
    parsed: JSON.parse(record.rawJson) as ParsedReceipt
  };
}

export function parseReceiptRecords(records: ReceiptRecord[]): ReceiptSummary[] {
  return records.map(parseReceiptRecord);
}

export function buildReceiptWhere(filters: ReceiptFilters) {
  const conditions: SQL[] = [];

  if (filters.month) {
    conditions.push(sql`substr(${receipts.urlDate}, 1, 7) = ${filters.month}`);
  }

  if (filters.category) {
    if (filters.category === '__unsorted__') {
      conditions.push(sql`(${receipts.category} IS NULL OR trim(${receipts.category}) = '')`);
    } else {
      conditions.push(eq(receipts.category, filters.category));
    }
  }

  if (filters.from) {
    conditions.push(gte(receipts.urlDate, filters.from));
  }

  if (filters.to) {
    conditions.push(lte(receipts.urlDate, filters.to));
  }

  if (conditions.length === 0) return undefined;

  return and(...conditions);
}
