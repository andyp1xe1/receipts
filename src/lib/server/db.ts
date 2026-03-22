import type { D1Result } from '@cloudflare/workers-types';
import type { ParsedReceipt, ReceiptRecord, ReceiptSummary } from '$lib/types';

function requireDb(platform: App.Platform | undefined): D1Database {
  const db = platform?.env.DB;
  if (!db) {
    throw new Error('Cloudflare D1 binding is not available');
  }
  return db;
}

function parseReceiptRecord(record: ReceiptRecord): ReceiptSummary {
  return {
    ...record,
    parsed: JSON.parse(record.raw_json) as ParsedReceipt
  };
}

export async function listReceipts(
  platform: App.Platform | undefined,
  filters: { month?: string | null; category?: string | null } = {}
): Promise<ReceiptSummary[]> {
  const db = requireDb(platform);
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (filters.month) {
    conditions.push('substr(url_date, 1, 7) = ?');
    values.push(filters.month);
  }

  if (filters.category) {
    if (filters.category === '__unsorted__') {
      conditions.push('(category IS NULL OR trim(category) = "")');
    } else {
      conditions.push('category = ?');
      values.push(filters.category);
    }
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const statement = db
    .prepare(
      `SELECT * FROM receipts ${where} ORDER BY url_date DESC, created_at DESC LIMIT 100`
    )
    .bind(...values);
  const result = await statement.all<ReceiptRecord>();
  return (result.results ?? []).map(parseReceiptRecord);
}

export async function getReceiptById(
  platform: App.Platform | undefined,
  id: string
): Promise<ReceiptSummary | null> {
  const db = requireDb(platform);
  const result = await db.prepare('SELECT * FROM receipts WHERE id = ? LIMIT 1').bind(id).first<ReceiptRecord>();
  return result ? parseReceiptRecord(result) : null;
}

export async function getExistingReceiptByCanonicalKey(
  platform: App.Platform | undefined,
  receipt: ParsedReceipt
): Promise<ReceiptSummary | null> {
  const db = requireDb(platform);
  const result = await db
    .prepare(
      `SELECT * FROM receipts
       WHERE ecc_id = ? AND url_total = ? AND url_receipt_number = ? AND url_date = ?
       LIMIT 1`
    )
    .bind(receipt.eccId, receipt.urlTotal, receipt.urlReceiptNumber, receipt.urlDate)
    .first<ReceiptRecord>();
  return result ? parseReceiptRecord(result) : null;
}

export async function insertReceipt(
  platform: App.Platform | undefined,
  receipt: ParsedReceipt,
  metadata: { category: string | null; note: string | null }
): Promise<string> {
  const db = requireDb(platform);
  const id = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO receipts (
        id, source_url, ecc_id, url_total, url_receipt_number, url_date,
        merchant_name, merchant_tax_id, issued_at, total,
        category, note, raw_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      receipt.sourceUrl,
      receipt.eccId,
      receipt.urlTotal,
      receipt.urlReceiptNumber,
      receipt.urlDate,
      receipt.merchant.name,
      receipt.merchant.taxId,
      receipt.issuedAt,
      receipt.total,
      metadata.category,
      metadata.note,
      JSON.stringify(receipt),
      timestamp,
      timestamp
    )
    .run();
  return id;
}

export async function updateReceiptMetadata(
  platform: App.Platform | undefined,
  input: { id: string; category: string | null; note: string | null }
): Promise<void> {
  const db = requireDb(platform);
  await db
    .prepare('UPDATE receipts SET category = ?, note = ?, updated_at = ? WHERE id = ?')
    .bind(input.category, input.note, new Date().toISOString(), input.id)
    .run();
}

export async function deleteReceipt(platform: App.Platform | undefined, id: string): Promise<void> {
  const db = requireDb(platform);
  await db.prepare('DELETE FROM receipts WHERE id = ?').bind(id).run();
}

export interface DashboardStats {
  totalSpend: number;
  receiptCount: number;
  topCategories: Array<{ category: string; total: number; count: number }>;
  monthlySpend: Array<{ month: string; total: number; count: number }>;
}

function rows<T>(result: D1Result<T>): T[] {
  return result.results ?? [];
}

export async function getDashboardStats(platform: App.Platform | undefined): Promise<DashboardStats> {
  const db = requireDb(platform);
  const [totalsResult, categoriesResult, monthlyResult] = await Promise.all([
    db.prepare('SELECT COUNT(*) as count, COALESCE(SUM(CAST(total AS REAL)), 0) as total FROM receipts').first<{ count: number; total: number }>(),
    db
      .prepare(
        `SELECT COALESCE(NULLIF(category, ''), 'Unsorted') as category,
                SUM(CAST(total AS REAL)) as total,
                COUNT(*) as count
         FROM receipts
         GROUP BY COALESCE(NULLIF(category, ''), 'Unsorted')
         ORDER BY total DESC
         LIMIT 6`
      )
      .all<{ category: string; total: number; count: number }>(),
    db
      .prepare(
        `SELECT substr(url_date, 1, 7) as month,
                SUM(CAST(total AS REAL)) as total,
                COUNT(*) as count
         FROM receipts
         GROUP BY substr(url_date, 1, 7)
         ORDER BY month DESC
         LIMIT 6`
      )
      .all<{ month: string; total: number; count: number }>()
  ]);

  return {
    totalSpend: totalsResult?.total ?? 0,
    receiptCount: totalsResult?.count ?? 0,
    topCategories: rows(categoriesResult),
    monthlySpend: rows(monthlyResult).reverse()
  };
}
