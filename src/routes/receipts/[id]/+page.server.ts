import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireRemoteUser } from '$lib/server/auth/guards';
import { deleteReceipt, getReceiptById, updateReceiptMetadata } from '$lib/server/db/receipts';
import { getFormString } from '$lib/server/forms';

export const load: PageServerLoad = async ({ locals, params, platform, url }) => {
  const created = url.searchParams.get('created') === '1';
  const duplicate = url.searchParams.get('duplicate') === '1';

  if (locals.user?.kind === 'local') {
    return { id: params.id, receipt: null, created, duplicate };
  }

  if (locals.user?.kind !== 'remote') {
    throw redirect(303, '/login');
  }

  const receipt = await getReceiptById(platform, locals.user.id, params.id);
  if (!receipt) {
    throw redirect(303, '/');
  }

  return { id: params.id, receipt, created, duplicate };
};

export const actions: Actions = {
  save: async ({ locals, request, platform, params }) => {
    const auth = requireRemoteUser(locals, 'Local mode saves changes in the browser.');
    if (!auth.ok) return auth.failure;

    const formData = await request.formData();
    const category = getFormString(formData, 'category').trim() || null;
    const note = getFormString(formData, 'note').trim() || null;

    await updateReceiptMetadata(platform, auth.userId, {
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
    const auth = requireRemoteUser(locals, 'Local mode deletes in the browser.');
    if (!auth.ok) return auth.failure;

    try {
      await deleteReceipt(platform, auth.userId, params.id);
    } catch {
      return fail(400, {
        type: 'error',
        message: 'Could not delete the receipt.'
      });
    }

    throw redirect(303, '/');
  }
};
