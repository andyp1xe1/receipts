import { describe, expect, it } from 'vitest';
import { SQLiteAsyncDialect } from 'drizzle-orm/sqlite-core';
import { buildReceiptWhere, nonEmptyCategoryExpr, totalExpr } from './shared';

const dialect = new SQLiteAsyncDialect();

function render(sqlFragment: ReturnType<typeof totalExpr> | ReturnType<typeof buildReceiptWhere>) {
  if (!sqlFragment) return null;
  return dialect.sqlToQuery(sqlFragment);
}

describe('db shared query helpers', () => {
  it('builds receipt filters with typed comparison operators', () => {
    const query = render(
      buildReceiptWhere({
        month: '2026-03',
        category: 'Fuel',
        from: '2026-03-01',
        to: '2026-03-31'
      })
    );

    expect(query?.sql).toContain('substr("receipts"."url_date", 1, 7) = ?');
    expect(query?.sql).toContain('"receipts"."category" = ?');
    expect(query?.sql).toContain('"receipts"."url_date" >= ?');
    expect(query?.sql).toContain('"receipts"."url_date" <= ?');
    expect(query?.params).toEqual(['2026-03', 'Fuel', '2026-03-01', '2026-03-31']);
  });

  it('builds the unsorted category predicate without a raw equality comparison', () => {
    const query = render(buildReceiptWhere({ category: '__unsorted__' }));

    expect(query?.sql).toContain('"receipts"."category" IS NULL');
    expect(query?.sql).toContain('trim("receipts"."category") = \'\'');
    expect(query?.params).toEqual([]);
  });

  it('keeps aggregate totals null-safe', () => {
    const query = render(totalExpr());

    expect(query?.sql).toContain('coalesce');
    expect(query?.sql).toContain('sum("receipts"."total")');
  });

  it('normalizes empty categories in a shared expression', () => {
    const query = render(nonEmptyCategoryExpr);

    expect(query?.sql).toContain('coalesce(nullif("receipts"."category", \'\'), \'Unsorted\')');
    expect(query?.params).toEqual([]);
  });
});
