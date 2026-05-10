import { and, desc, eq } from 'drizzle-orm';
import type { ParsedReceipt, ReceiptRecord, ReceiptSummary } from '$lib/types';
import { getDb } from './db';
import { receipts } from './schema';
import {
  buildReceiptWhere,
  parseReceiptRecord,
  type ReceiptFilters
} from './shared';

export async function listReceiptsForExport(
  platform: App.Platform | undefined,
  filters: ReceiptFilters = {},
  options: { limit?: number | null } = {}
): Promise<ReceiptRecord[]> {
  const baseQuery = getDb(platform)
    .select()
    .from(receipts)
    .where(buildReceiptWhere(filters))
    .orderBy(desc(receipts.urlDate), desc(receipts.createdAt));

  return typeof options.limit === 'number' ? await baseQuery.limit(options.limit).all() : await baseQuery.all();
}

export async function getReceiptById(
  platform: App.Platform | undefined,
  id: string
): Promise<ReceiptSummary | null> {
  const result = await getDb(platform).select().from(receipts).where(eq(receipts.id, id)).get();
  return result ? parseReceiptRecord(result) : null;
}

export async function getExistingReceiptByCanonicalKey(
  platform: App.Platform | undefined,
  receipt: ParsedReceipt
): Promise<ReceiptSummary | null> {
  const result = await getDb(platform)
    .select()
    .from(receipts)
    .where(
      and(
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
  receipt: ParsedReceipt,
  metadata: { category: string | null; note: string | null }
): Promise<string> {
  const id = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  await getDb(platform).insert(receipts).values({
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
  });

  return id;
}

export async function updateReceiptMetadata(
  platform: App.Platform | undefined,
  input: { id: string; category: string | null; note: string | null }
): Promise<void> {
  await getDb(platform)
    .update(receipts)
    .set({
      category: input.category,
      note: input.note,
      updatedAt: new Date().toISOString()
    })
    .where(eq(receipts.id, input.id));
}

export async function deleteReceipt(platform: App.Platform | undefined, id: string): Promise<void> {
  await getDb(platform).delete(receipts).where(eq(receipts.id, id));
}
