import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { deleteReceipt, getReceiptById, updateReceiptMetadata } from '$lib/server/db/receipts';
import { getFormString } from '$lib/server/forms';

export const load: PageServerLoad = async ({ params, platform, url }) => {
  const receipt = await getReceiptById(platform, params.id);
  if (!receipt) {
    throw redirect(303, '/');
  }

  return {
    receipt,
    created: url.searchParams.get('created') === '1',
    duplicate: url.searchParams.get('duplicate') === '1'
  };
};

export const actions: Actions = {
  save: async ({ request, platform, params }) => {
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

  delete: async ({ platform, params }) => {
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
