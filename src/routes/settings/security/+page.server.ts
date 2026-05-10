import { fail, redirect } from '@sveltejs/kit';
import QRCode from 'qrcode';
import type { Actions, PageServerLoad } from './$types';
import { createAuth } from '$lib/server/auth/auth';
import { authErrorMessage, isHttpControlFlow } from '$lib/server/auth/errors';
import { getFormString } from '$lib/server/forms';

export const load: PageServerLoad = async ({ locals, url }) => {
  if (!locals.user) {
    throw redirect(303, '/login');
  }

  return {
    justConfigured: url.searchParams.get('enabled') === '1',
    passwordUpdated: url.searchParams.get('password') === 'updated',
    welcome: url.searchParams.get('welcome') === '1'
  };
};

export const actions: Actions = {
  password: async (event) => {
    if (!event.locals.user) {
      throw redirect(303, '/login');
    }

    const formData = await event.request.formData();
    const currentPassword = getFormString(formData, 'current_password');
    const newPassword = getFormString(formData, 'new_password');
    const confirmPassword = getFormString(formData, 'confirm_password');

    if (!currentPassword || !newPassword || !confirmPassword) {
      return fail(400, {
        stage: 'password',
        message: 'Enter your current password, new password, and confirmation.'
      });
    }

    if (newPassword.length < 12) {
      return fail(400, {
        stage: 'password',
        message: 'Use at least 12 characters for the new password.'
      });
    }

    if (newPassword !== confirmPassword) {
      return fail(400, {
        stage: 'password',
        message: 'New password and confirmation must match.'
      });
    }

    try {
      await createAuth(event).api.changePassword({
        body: {
          currentPassword,
          newPassword,
          revokeOtherSessions: true
        },
        headers: event.request.headers
      });

      throw redirect(303, '/settings/security?password=updated');
    } catch (error) {
      if (isHttpControlFlow(error)) throw error;

      return fail(400, {
        stage: 'password',
        message: authErrorMessage(error, 'Could not update your password.')
      });
    }
  },

  enable: async (event) => {
    if (!event.locals.user) {
      throw redirect(303, '/login');
    }

    const formData = await event.request.formData();
    const password = getFormString(formData, 'password');

    if (!password) {
      return fail(400, {
        stage: 'enable',
        message: 'Enter your password to generate a TOTP secret.'
      });
    }

    try {
      const result = await createAuth(event).api.enableTwoFactor({
        body: { password },
        headers: event.request.headers
      });

      return {
        stage: 'enable',
        message: 'Scan the QR code, then verify the current code below.',
        backupCodes: result.backupCodes,
        qrCodeDataUrl: await QRCode.toDataURL(result.totpURI),
        totpUri: result.totpURI
      };
    } catch (error) {
      return fail(400, {
        stage: 'enable',
        message: authErrorMessage(error, 'Could not start two-factor setup.')
      });
    }
  },

  verify: async (event) => {
    if (!event.locals.user) {
      throw redirect(303, '/login');
    }

    const formData = await event.request.formData();
    const code = getFormString(formData, 'code').trim();
    const trustDevice = formData.get('trust_device') === 'on';

    if (!code) {
      return fail(400, {
        stage: 'verify',
        message: 'Enter the current authenticator code to finish setup.'
      });
    }

    try {
      await createAuth(event).api.verifyTOTP({
        body: { code, trustDevice },
        headers: event.request.headers
      });

      throw redirect(303, '/settings/security?enabled=1');
    } catch (error) {
      if (isHttpControlFlow(error)) throw error;

      return fail(400, {
        stage: 'verify',
        message: authErrorMessage(error, 'Could not verify that authenticator code.')
      });
    }
  },

  regenerate: async (event) => {
    if (!event.locals.user) {
      throw redirect(303, '/login');
    }

    const formData = await event.request.formData();
    const password = getFormString(formData, 'password');

    if (!password) {
      return fail(400, {
        stage: 'regenerate',
        message: 'Enter your password to issue a fresh backup code set.'
      });
    }

    try {
      const result = await createAuth(event).api.generateBackupCodes({
        body: { password },
        headers: event.request.headers
      });

      return {
        stage: 'regenerate',
        backupCodes: result.backupCodes,
        message: 'Generated a new set of backup codes. Save them before leaving this page.'
      };
    } catch (error) {
      return fail(400, {
        stage: 'regenerate',
        message: authErrorMessage(error, 'Could not generate backup codes.')
      });
    }
  },

  disable: async (event) => {
    if (!event.locals.user) {
      throw redirect(303, '/login');
    }

    const formData = await event.request.formData();
    const password = getFormString(formData, 'password');

    if (!password) {
      return fail(400, {
        stage: 'disable',
        message: 'Enter your password to turn two-factor authentication off.'
      });
    }

    try {
      await createAuth(event).api.disableTwoFactor({
        body: { password },
        headers: event.request.headers
      });

      return {
        stage: 'disable',
        type: 'success' as const,
        message: 'Two-factor authentication is now disabled.'
      };
    } catch (error) {
      return fail(400, {
        stage: 'disable',
        type: 'error' as const,
        message: authErrorMessage(error, 'Could not disable two-factor authentication.')
      });
    }
  }
};
