import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
  getDashboardStats,
  getExistingReceiptByCanonicalKey,
  insertReceipt,
  listReceipts
} from '$lib/server/db';
import { fetchAndParseReceipt } from '$lib/server/mev';

export const load: PageServerLoad = async ({ platform, url }) => {
  const month = url.searchParams.get('month');
  const category = url.searchParams.get('category');
  const [receipts, stats] = await Promise.all([
    listReceipts(platform, { month, category }),
    getDashboardStats(platform)
  ]);

  return {
    month,
    category,
    receipts,
    stats,
    categories: [...new Set(receipts.map((receipt) => receipt.category || 'Unsorted'))]
  };
};

export const actions: Actions = {
  ingest: async ({ request, platform }) => {
    const formData = await request.formData();
    const sourceUrl = String(formData.get('source_url') ?? '').trim();
    const category = String(formData.get('category') ?? '').trim() || null;
    const note = String(formData.get('note') ?? '').trim() || null;

    if (!sourceUrl.startsWith('http')) {
      return fail(400, {
        type: 'error',
        message: 'Paste a full MEV receipt URL.'
      });
    }

    let destination: string | null = null;

    try {
      const parsed = await fetchAndParseReceipt(sourceUrl);
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
        message: error instanceof Error ? error.message : 'Receipt import failed.'
      });
    }

    throw redirect(303, destination);
  }
};
