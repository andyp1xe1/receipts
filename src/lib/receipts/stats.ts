import type { EnhancedStats, ReceiptRecord } from '$lib/types';
import { slugCategory } from '$lib/utils/format';

export interface DashboardStats {
  totalSpend: number;
  receiptCount: number;
  topCategories: Array<{ category: string; total: number; count: number }>;
  monthlySpend: Array<{ month: string; total: number; count: number }>;
}

type Period = EnhancedStats['period'];

function totalOf(record: ReceiptRecord): number {
  const parsed = Number(record.total);
  return Number.isFinite(parsed) ? parsed : 0;
}

function monthOf(record: ReceiptRecord): string {
  return record.urlDate.slice(0, 7);
}

function periodKey(record: ReceiptRecord, period: Period): string {
  if (period === 'monthly') return record.urlDate.slice(0, 7);
  if (period === 'yearly') return record.urlDate.slice(0, 4);
  const date = new Date(`${record.urlDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return record.urlDate;
  const dow = date.getUTCDay();
  const daysFromMonday = (dow + 6) % 7;
  date.setUTCDate(date.getUTCDate() - daysFromMonday);
  return date.toISOString().slice(0, 10);
}

function emptyBucket() {
  return { total: 0, count: 0 };
}

export function computeDashboardStats(records: ReceiptRecord[]): DashboardStats {
  let totalSpend = 0;
  const byCategory = new Map<string, { total: number; count: number }>();
  const byMonth = new Map<string, { total: number; count: number }>();

  for (const record of records) {
    const amount = totalOf(record);
    totalSpend += amount;

    const cat = slugCategory(record.category);
    const catBucket = byCategory.get(cat) ?? emptyBucket();
    catBucket.total += amount;
    catBucket.count += 1;
    byCategory.set(cat, catBucket);

    const month = monthOf(record);
    const monthBucket = byMonth.get(month) ?? emptyBucket();
    monthBucket.total += amount;
    monthBucket.count += 1;
    byMonth.set(month, monthBucket);
  }

  const topCategories = [...byCategory.entries()]
    .map(([category, bucket]) => ({ category, ...bucket }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);

  const monthlySpend = [...byMonth.entries()]
    .map(([month, bucket]) => ({ month, ...bucket }))
    .sort((a, b) => (a.month < b.month ? -1 : a.month > b.month ? 1 : 0))
    .slice(-6);

  return {
    totalSpend,
    receiptCount: records.length,
    topCategories,
    monthlySpend
  };
}

export function computeEnhancedStats(
  records: ReceiptRecord[],
  period: Period = 'monthly'
): EnhancedStats {
  const totals = new Map<string, { total: number; count: number }>();
  const categoryTotals = new Map<string, { period: string; category: string; total: number; count: number }>();

  for (const record of records) {
    const key = periodKey(record, period);
    const amount = totalOf(record);
    const total = totals.get(key) ?? emptyBucket();
    total.total += amount;
    total.count += 1;
    totals.set(key, total);

    const cat = slugCategory(record.category);
    const catKey = `${key}\u0000${cat}`;
    const existing = categoryTotals.get(catKey);
    if (existing) {
      existing.total += amount;
      existing.count += 1;
    } else {
      categoryTotals.set(catKey, { period: key, category: cat, total: amount, count: 1 });
    }
  }

  const periodTotals = [...totals.entries()]
    .map(([p, bucket]) => ({ period: p, ...bucket }))
    .sort((a, b) => (a.period < b.period ? 1 : a.period > b.period ? -1 : 0))
    .slice(0, 12);

  const categoryByPeriod = [...categoryTotals.values()].sort((a, b) => {
    if (a.period !== b.period) return a.period < b.period ? 1 : -1;
    return b.total - a.total;
  });

  return { period, periodTotals, categoryByPeriod };
}
