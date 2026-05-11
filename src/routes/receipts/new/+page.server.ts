import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { synthesizeNewReceipt, parseReceiptUrl } from '$lib/receipts';
import { getExistingReceiptByCanonicalKey, insertReceipt } from '$lib/server/db/receipts';
import { getFormString } from '$lib/server/forms';

export const load: PageServerLoad = async ({ url }) => {
  const prefillUrl = url.searchParams.get('prefill');
  const metadata = prefillUrl ? parseReceiptUrl(prefillUrl) : null;

  return {
    prefill: metadata
      ? {
          sourceUrl: metadata.sourceUrl,
          urlDate: metadata.urlDate,
          urlTotal: metadata.urlTotal,
          eccId: metadata.eccId,
          urlReceiptNumber: metadata.urlReceiptNumber
        }
      : null
  };
};

function readForm(formData: FormData) {
  return {
    merchantName: getFormString(formData, 'merchant_name').trim(),
    total: getFormString(formData, 'total').trim(),
    urlDate: getFormString(formData, 'url_date').trim(),
    sourceUrl: getFormString(formData, 'source_url').trim() || undefined,
    category: getFormString(formData, 'category').trim() || null,
    note: getFormString(formData, 'note').trim() || null
  };
}

export const actions: Actions = {
  save: async ({ locals, request, platform }) => {
    if (locals.user?.kind === 'local') {
      return fail(400, { type: 'error', message: 'Local mode saves in the browser.' });
    }
    if (locals.user?.kind !== 'remote') {
      return fail(401, { type: 'error', message: 'Sign in to add a receipt.' });
    }
    const userId = locals.user.id;

    const formData = await request.formData();
    const input = readForm(formData);

    if (!input.merchantName || !input.total || !input.urlDate) {
      return fail(400, {
        type: 'error',
        message: 'Merchant, date and total are required.',
        values: input
      });
    }

    const parsed = synthesizeNewReceipt(input);

    const existing = await getExistingReceiptByCanonicalKey(platform, userId, parsed);
    if (existing) {
      throw redirect(303, `/receipts/${existing.id}?duplicate=1`);
    }

    const id = await insertReceipt(platform, userId, parsed, {
      category: input.category,
      note: input.note
    });

    throw redirect(303, `/receipts/${id}?created=1`);
  }
};
