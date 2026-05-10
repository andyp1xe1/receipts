import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { deleteReceipt, getReceiptById, updateReceiptMetadata } from '$lib/server/db/receipts';
import { getFormString } from '$lib/server/forms';

export const load: PageServerLoad = async ({ locals, params, platform, url }) => {
  const created = url.searchParams.get('created') === '1';
  const duplicate = url.searchParams.get('duplicate') === '1';

  if (locals.user?.kind === 'local') {
    return { kind: 'local' as const, id: params.id, created, duplicate };
  }

  const receipt = await getReceiptById(platform, params.id);
  if (!receipt) {
    throw redirect(303, '/');
  }

  return { kind: 'remote' as const, receipt, created, duplicate };
};

export const actions: Actions = {
  save: async ({ locals, request, platform, params }) => {
    if (locals.user?.kind === 'local') {
      return fail(400, { type: 'error', message: 'Local mode saves changes in the browser.' });
    }

    const formData = await request.formData();
    const category = getFormString(formData, 'category').trim() || null;
    const note = getFormString(formData, 'note').trim() || null;

    await updateReceiptMetadata(platform, {
      id: params.id,
      category,
      note
    });

    return {
      type: 'success',
      message: 'Metadata saved.'
    };
  },

  delete: async ({ locals, platform, params }) => {
    if (locals.user?.kind === 'local') {
      return fail(400, { type: 'error', message: 'Local mode deletes in the browser.' });
    }

    try {
      await deleteReceipt(platform, params.id);
    } catch {
      return fail(400, {
        type: 'error',
        message: 'Could not delete the receipt.'
      });
    }

    throw redirect(303, '/');
  }
};
