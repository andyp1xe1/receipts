import { and, desc, eq, sql } from 'drizzle-orm';
import type { ParsedReceipt, ReceiptRecord, ReceiptSummary } from '$lib/types';
import { getDb } from './db';
import { receipts } from './schema';
import {
  buildReceiptWhere,
  parseReceiptRecord,
  parseReceiptRecords,
  type ReceiptFilters
} from './shared';

function scopeForUser(userId: string) {
  return eq(receipts.userId, userId);
}

function scopedWhere(userId: string, filters: ReceiptFilters) {
  const filterWhere = buildReceiptWhere(filters);
  return filterWhere ? and(scopeForUser(userId), filterWhere) : scopeForUser(userId);
}

export async function listReceiptsForExport(
  platform: App.Platform | undefined,
  userId: string,
  filters: ReceiptFilters = {},
  options: { limit?: number | null } = {}
): Promise<ReceiptRecord[]> {
  const baseQuery = getDb(platform)
    .select()
    .from(receipts)
    .where(scopedWhere(userId, filters))
    .orderBy(desc(receipts.urlDate), desc(receipts.createdAt));

  return typeof options.limit === 'number' ? await baseQuery.limit(options.limit).all() : await baseQuery.all();
}

export async function listReceiptsPaginated(
  platform: App.Platform | undefined,
  userId: string,
  filters: ReceiptFilters,
  page: { limit: number; skip: number }
): Promise<{ items: ReceiptSummary[]; total: number }> {
  const db = getDb(platform);
  const where = scopedWhere(userId, filters);

  const rows = await db
    .select()
    .from(receipts)
    .where(where)
    .orderBy(desc(receipts.urlDate), desc(receipts.createdAt))
    .limit(page.limit)
    .offset(page.skip)
    .all();

  const totalRow = await db.select({ value: sql<number>`count(*)` }).from(receipts).where(where).get();

  return {
    items: parseReceiptRecords(rows),
    total: Number(totalRow?.value ?? 0)
  };
}

export async function getReceiptById(
  platform: App.Platform | undefined,
  userId: string,
  id: string
): Promise<ReceiptSummary | null> {
  const result = await getDb(platform)
    .select()
    .from(receipts)
    .where(and(eq(receipts.id, id), scopeForUser(userId)))
    .get();
  return result ? parseReceiptRecord(result) : null;
}

export async function getExistingReceiptByCanonicalKey(
  platform: App.Platform | undefined,
  userId: string,
  receipt: ParsedReceipt
): Promise<ReceiptSummary | null> {
  const result = await getDb(platform)
    .select()
    .from(receipts)
    .where(
      and(
        scopeForUser(userId),
        eq(receipts.eccId, receipt.eccId),
        eq(receipts.urlTotal, receipt.urlTotal),
        eq(receipts.urlReceiptNumber, receipt.urlReceiptNumber),
        eq(receipts.urlDate, receipt.urlDate)
      )
    )
    .get();

  return result ? parseReceiptRecord(result) : null;
}

export async function insertReceipt(
  platform: App.Platform | undefined,
  userId: string,
  receipt: ParsedReceipt,
  metadata: { category: string | null; note: string | null }
): Promise<string> {
  const id = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  await getDb(platform).insert(receipts).values({
    id,
    userId,
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
  });

  return id;
}

export async function updateReceiptMetadata(
  platform: App.Platform | undefined,
  userId: string,
  input: { id: string; category: string | null; note: string | null }
): Promise<void> {
  await getDb(platform)
    .update(receipts)
    .set({
      category: input.category,
      note: input.note,
      updatedAt: new Date().toISOString()
    })
    .where(and(eq(receipts.id, input.id), scopeForUser(userId)));
}

export async function deleteReceipt(
  platform: App.Platform | undefined,
  userId: string,
  id: string
): Promise<void> {
  await getDb(platform).delete(receipts).where(and(eq(receipts.id, id), scopeForUser(userId)));
}
