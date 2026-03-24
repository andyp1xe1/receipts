import { count, desc, sql } from 'drizzle-orm';
import type { EnhancedStats } from '$lib/types';
import { getDb } from './db';
import { receipts } from './schema';
import { monthExpr, nonEmptyCategoryExpr, totalExpr } from './shared';

export interface DashboardStats {
  totalSpend: number;
  receiptCount: number;
  topCategories: Array<{ category: string; total: number; count: number }>;
  monthlySpend: Array<{ month: string; total: number; count: number }>;
}

export async function getDashboardStats(platform: App.Platform | undefined): Promise<DashboardStats> {
  const db = getDb(platform);
  const totalSpendExpr = totalExpr();
  const monthlySpendExpr = totalExpr();
  const [totalsResult, categoriesResult, monthlyResult] = await Promise.all([
    db.select({ count: count(), total: totalSpendExpr }).from(receipts).get(),
    db
      .select({
        category: nonEmptyCategoryExpr,
        total: totalExpr(),
        count: count()
      })
      .from(receipts)
      .groupBy(nonEmptyCategoryExpr)
      .orderBy(desc(totalExpr()))
      .limit(6)
      .all(),
    db
      .select({
        month: monthExpr,
        total: monthlySpendExpr,
        count: count()
      })
      .from(receipts)
      .groupBy(monthExpr)
      .orderBy(desc(monthExpr))
      .limit(6)
      .all()
  ]);

  return {
    totalSpend: totalsResult?.total ?? 0,
    receiptCount: totalsResult?.count ?? 0,
    topCategories: categoriesResult,
    monthlySpend: monthlyResult.reverse()
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
  const db = getDb(platform);
  const periodExpr = sql.raw(periodExpressions[period]);
  const periodTotalExpr = totalExpr();

  const [totalsResult, categoryResult] = await Promise.all([
    db
      .select({
        period: periodExpr,
        total: periodTotalExpr,
        count: count()
      })
      .from(receipts)
      .groupBy(periodExpr)
      .orderBy(desc(periodExpr))
      .limit(12)
      .all(),
    db
      .select({
        period: periodExpr,
        category: nonEmptyCategoryExpr,
        total: totalExpr(),
        count: count()
      })
      .from(receipts)
      .groupBy(periodExpr, nonEmptyCategoryExpr)
      .orderBy(desc(periodExpr), desc(totalExpr()))
      .all()
  ]);

  return {
    period,
    periodTotals: totalsResult.map((row) => ({
      period: String(row.period),
      total: row.total,
      count: row.count
    })),
    categoryByPeriod: categoryResult.map((row) => ({
      period: String(row.period),
      category: row.category,
      total: row.total,
      count: row.count
    }))
  };
}
