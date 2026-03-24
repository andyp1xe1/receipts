import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createAuth } from '$lib/server/auth/auth';
import { authErrorMessage, isHttpControlFlow } from '$lib/server/auth/errors';

export const load: PageServerLoad = async ({ locals }) => {
  if (locals.user) {
    throw redirect(303, '/');
  }

  return {};
};

export const actions: Actions = {
  verifyTotp: async (event) => {
    const formData = await event.request.formData();
    const code = String(formData.get('code') ?? '').trim();
    const trustDevice = formData.get('trust_device') === 'on';

    if (!code) {
      return fail(400, {
        type: 'totp',
        message: 'Enter the 6-digit code from your authenticator app.'
      });
    }

    try {
      await createAuth(event).api.verifyTOTP({
        body: { code, trustDevice },
        headers: event.request.headers
      });

      throw redirect(303, '/');
    } catch (error) {
      if (isHttpControlFlow(error)) throw error;

      return fail(400, {
        type: 'totp',
        message: authErrorMessage(error, 'Could not verify the authenticator code.')
      });
    }
  },

  verifyBackupCode: async (event) => {
    const formData = await event.request.formData();
    const code = String(formData.get('backup_code') ?? '').trim();
    const trustDevice = formData.get('backup_trust_device') === 'on';

    if (!code) {
      return fail(400, {
        type: 'backup',
        message: 'Enter one of your saved backup codes.'
      });
    }

    try {
      await createAuth(event).api.verifyBackupCode({
        body: { code, trustDevice },
        headers: event.request.headers
      });

      throw redirect(303, '/');
    } catch (error) {
      if (isHttpControlFlow(error)) throw error;

      return fail(400, {
        type: 'backup',
        message: authErrorMessage(error, 'Could not verify that backup code.')
      });
    }
  }
};
