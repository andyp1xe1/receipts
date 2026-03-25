import { describe, expect, it, vi } from 'vitest';

vi.mock('$lib/server/db/receipts', () => ({
  getExistingReceiptByCanonicalKey: vi.fn(),
  insertReceipt: vi.fn(),
  listReceiptCategories: vi.fn(),
  listReceipts: vi.fn()
}));

vi.mock('$lib/server/db/stats', () => ({
  getDashboardStats: vi.fn(),
  getEnhancedStats: vi.fn()
}));

import * as receiptDb from '$lib/server/db/receipts';
import * as statsDb from '$lib/server/db/stats';
import { load } from './+page.server';

describe('+page.server load', () => {
  it('loads export categories from the full dataset instead of the filtered receipt list', async () => {
    vi.mocked(receiptDb.listReceipts).mockResolvedValue([
      {
        id: 'r1',
        category: 'Fuel'
      } as Awaited<ReturnType<typeof receiptDb.listReceipts>>[number]
    ]);
    vi.mocked(statsDb.getDashboardStats).mockResolvedValue({
      totalSpend: 10,
      receiptCount: 1,
      topCategories: [],
      monthlySpend: []
    });
    vi.mocked(statsDb.getEnhancedStats).mockResolvedValue({
      period: 'monthly',
      periodTotals: [],
      categoryByPeriod: []
    });
    vi.mocked(receiptDb.listReceiptCategories).mockResolvedValue(['Fuel', 'Groceries', 'Unsorted']);

    const result = (await load({
      platform: undefined,
      url: new URL('https://example.test/?month=2026-02')
    } as Parameters<typeof load>[0])) as {
      categories: string[];
      exportCategories: string[];
    };

    expect(receiptDb.listReceipts).toHaveBeenCalledWith(undefined, {
      month: '2026-02',
      category: null
    });
    expect(result.categories).toEqual(['Fuel']);
    expect(result.exportCategories).toEqual(['Fuel', 'Groceries', 'Unsorted']);
  });
});
