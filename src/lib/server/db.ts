import type { D1Result } from '@cloudflare/workers-types';
import type { ParsedReceipt, ReceiptRecord, ReceiptSummary, EnhancedStats } from '$lib/types';

interface ReceiptFilters {
  month?: string | null;
  category?: string | null;
  from?: string | null;
  to?: string | null;
}

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
  filters: ReceiptFilters = {}
): Promise<ReceiptSummary[]> {
  const records = await queryReceipts(platform, filters, { limit: 100 });
  return records.map(parseReceiptRecord);
}

export async function listReceiptsForExport(
  platform: App.Platform | undefined,
  filters: ReceiptFilters = {},
  options: { limit?: number | null } = {}
): Promise<ReceiptRecord[]> {
  return queryReceipts(platform, filters, { limit: options.limit ?? null });
}

export async function countReceipts(
  platform: App.Platform | undefined,
  filters: ReceiptFilters = {}
): Promise<number> {
  const db = requireDb(platform);
  const { where, values } = buildReceiptQuery(filters);
  const result = await db
    .prepare(`SELECT COUNT(*) as count FROM receipts ${where}`)
    .bind(...values)
    .first<{ count: number }>();

  return result?.count ?? 0;
}

export async function listReceiptCategories(platform: App.Platform | undefined): Promise<string[]> {
  const db = requireDb(platform);
  const result = await db
    .prepare(
      `SELECT DISTINCT COALESCE(NULLIF(category, ''), 'Unsorted') as category
       FROM receipts
       ORDER BY category COLLATE NOCASE ASC`
    )
    .all<{ category: string }>();

  return rows(result).map((row) => row.category);
}

function buildReceiptQuery(filters: ReceiptFilters): { where: string; values: unknown[] } {
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

  if (filters.from) {
    conditions.push('url_date >= ?');
    values.push(filters.from);
  }

  if (filters.to) {
    conditions.push('url_date <= ?');
    values.push(filters.to);
  }

  return {
    where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
    values
  };
}

async function queryReceipts(
  platform: App.Platform | undefined,
  filters: ReceiptFilters,
  options: { limit?: number | null } = {}
): Promise<ReceiptRecord[]> {
  const db = requireDb(platform);
  const { where, values } = buildReceiptQuery(filters);
  const limitClause = typeof options.limit === 'number' ? ' LIMIT ?' : '';
  const statement = db
    .prepare(`SELECT * FROM receipts ${where} ORDER BY url_date DESC, created_at DESC${limitClause}`)
    .bind(...(typeof options.limit === 'number' ? [...values, options.limit] : values));
  const result = await statement.all<ReceiptRecord>();
  return result.results ?? [];
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

const periodExpressions = {
  weekly:
    "date(url_date, '-' || ((cast(strftime('%w', url_date) as integer) + 6) % 7) || ' days')",
  monthly: 'substr(url_date, 1, 7)',
  yearly: 'substr(url_date, 1, 4)'
} as const;

export async function getEnhancedStats(
  platform: App.Platform | undefined,
  period: 'weekly' | 'monthly' | 'yearly' = 'monthly'
): Promise<EnhancedStats> {
  const db = requireDb(platform);
  const expr = periodExpressions[period];

  const [totalsResult, categoryResult] = await Promise.all([
    db
      .prepare(
        `SELECT ${expr} as period,
                SUM(CAST(total AS REAL)) as total,
                COUNT(*) as count
         FROM receipts
         GROUP BY period
         ORDER BY period DESC
         LIMIT 12`
      )
      .all<{ period: string; total: number; count: number }>(),
    db
      .prepare(
        `SELECT ${expr} as period,
                COALESCE(NULLIF(category, ''), 'Unsorted') as category,
                SUM(CAST(total AS REAL)) as total,
                COUNT(*) as count
         FROM receipts
         GROUP BY period, category
         ORDER BY period DESC, total DESC`
      )
      .all<{ period: string; category: string; total: number; count: number }>()
  ]);

  return {
    period,
    periodTotals: rows(totalsResult),
    categoryByPeriod: rows(categoryResult)
  };
}
