import { describe, expect, it, vi } from 'vitest';

vi.mock('$lib/server/db', () => ({
  getDashboardStats: vi.fn(),
  getEnhancedStats: vi.fn(),
  getExistingReceiptByCanonicalKey: vi.fn(),
  insertReceipt: vi.fn(),
  listReceiptCategories: vi.fn(),
  listReceipts: vi.fn()
}));

import * as db from '$lib/server/db';
import { load } from './+page.server';

describe('+page.server load', () => {
  it('loads export categories from the full dataset instead of the filtered receipt list', async () => {
    vi.mocked(db.listReceipts).mockResolvedValue([
      {
        id: 'r1',
        category: 'Fuel'
      } as Awaited<ReturnType<typeof db.listReceipts>>[number]
    ]);
    vi.mocked(db.getDashboardStats).mockResolvedValue({
      totalSpend: 10,
      receiptCount: 1,
      topCategories: [],
      monthlySpend: []
    });
    vi.mocked(db.getEnhancedStats).mockResolvedValue({
      period: 'monthly',
      periodTotals: [],
      categoryByPeriod: []
    });
    vi.mocked(db.listReceiptCategories).mockResolvedValue(['Fuel', 'Groceries', 'Unsorted']);

    const result = (await load({
      platform: undefined,
      url: new URL('https://example.test/?month=2026-02')
    } as Parameters<typeof load>[0])) as {
      categories: string[];
      exportCategories: string[];
    };

    expect(db.listReceipts).toHaveBeenCalledWith(undefined, {
      month: '2026-02',
      category: null
    });
    expect(result.categories).toEqual(['Fuel']);
    expect(result.exportCategories).toEqual(['Fuel', 'Groceries', 'Unsorted']);
  });
});
