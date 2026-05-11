import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createAuth } from '$lib/server/auth/auth';
import { requireRemoteUser } from '$lib/server/auth/guards';
import { clearLocalSession, hasLocalSession } from '$lib/server/auth/local-session';
import { getExistingReceiptByCanonicalKey, insertReceipt, listReceiptsForExport } from '$lib/server/db/receipts';
import { getFormString } from '$lib/server/forms';
import { fetchAndParseReceipt } from '$lib/server/mev/mev';
import { normalizeReceiptSource } from '$lib/utils/receipt-source';

export const load: PageServerLoad = async ({ locals, platform, url }) => {
  const month = url.searchParams.get('month');
  const category = url.searchParams.get('category');
  const periodParam = url.searchParams.get('period');
  const period = (['weekly', 'monthly', 'yearly'] as const).includes(
    periodParam as 'weekly' | 'monthly' | 'yearly'
  )
    ? (periodParam as 'weekly' | 'monthly' | 'yearly')
    : 'monthly';

  if (locals.user?.kind === 'local') {
    return { month, category, period, kind: 'local' as const, receipts: [] };
  }

  if (locals.user?.kind !== 'remote') {
    return { month, category, period, kind: 'remote' as const, receipts: [] };
  }

  const receipts = await listReceiptsForExport(platform, locals.user.id, {});
  return { month, category, period, kind: 'remote' as const, receipts };
};

export const actions: Actions = {
  ingest: async ({ locals, request, platform }) => {
    const auth = requireRemoteUser(locals, 'Local mode handles imports in the browser.');
    if (!auth.ok) return auth.failure;
    const { userId } = auth;
    const formData = await request.formData();
    const sourceUrl = getFormString(formData, 'source_url').trim();
    const category = getFormString(formData, 'category').trim() || null;
    const note = getFormString(formData, 'note').trim() || null;
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
      const existing = await getExistingReceiptByCanonicalKey(platform, userId, parsed);
      if (existing) {
        destination = `/receipts/${existing.id}?duplicate=1`;
      } else {
        const id = await insertReceipt(platform, userId, parsed, { category, note });
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
  },

  logout: async (event) => {
    if (hasLocalSession(event.cookies)) {
      clearLocalSession(event.cookies);
    } else if (event.locals.authTablesReady) {
      await createAuth(event).api.signOut({
        headers: event.request.headers
      });
    }
    throw redirect(303, '/login');
  }
};
