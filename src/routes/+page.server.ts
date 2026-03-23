import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
  getDashboardStats,
  getEnhancedStats,
  getExistingReceiptByCanonicalKey,
  insertReceipt,
  listReceiptCategories,
  listReceipts
} from '$lib/server/db';
import { fetchAndParseReceipt } from '$lib/server/mev';
import { normalizeReceiptSource } from '$lib/utils/receipt-source';

export const load: PageServerLoad = async ({ platform, url }) => {
  const month = url.searchParams.get('month');
  const category = url.searchParams.get('category');
  const periodParam = url.searchParams.get('period');
  const period = (['weekly', 'monthly', 'yearly'] as const).includes(
    periodParam as 'weekly' | 'monthly' | 'yearly'
  )
    ? (periodParam as 'weekly' | 'monthly' | 'yearly')
    : 'monthly';

  const [receipts, stats, enhancedStats, exportCategories] = await Promise.all([
    listReceipts(platform, { month, category }),
    getDashboardStats(platform),
    getEnhancedStats(platform, period),
    listReceiptCategories(platform)
  ]);

  return {
    month,
    category,
    period,
    receipts,
    stats,
    enhancedStats,
    categories: [...new Set(receipts.map((receipt) => receipt.category || 'Unsorted'))],
    exportCategories
  };
};

export const actions: Actions = {
  ingest: async ({ request, platform }) => {
    const formData = await request.formData();
    const sourceUrl = String(formData.get('source_url') ?? '').trim();
    const category = String(formData.get('category') ?? '').trim() || null;
    const note = String(formData.get('note') ?? '').trim() || null;
    const values = {
      source_url: sourceUrl,
      category: category ?? '',
      note: note ?? ''
    };
    const normalizedSourceUrl = normalizeReceiptSource(sourceUrl);

    if (!normalizedSourceUrl) {
      return fail(400, {
        type: 'error',
        message: 'Paste or scan a full MEV receipt URL.',
        values
      });
    }

    let destination: string | null = null;

    try {
      const parsed = await fetchAndParseReceipt(normalizedSourceUrl);
      const existing = await getExistingReceiptByCanonicalKey(platform, parsed);
      if (existing) {
        destination = `/receipts/${existing.id}?duplicate=1`;
      } else {
        const id = await insertReceipt(platform, parsed, { category, note });
        destination = `/receipts/${id}?created=1`;
      }
    } catch (error) {
      return fail(400, {
        type: 'error',
        message: error instanceof Error ? error.message : 'Receipt import failed.',
        values
      });
    }

    throw redirect(303, destination);
  }
};
