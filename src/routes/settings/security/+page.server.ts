import { fail, redirect } from '@sveltejs/kit';
import QRCode from 'qrcode';
import type { Actions, PageServerLoad } from './$types';
import { createAuth } from '$lib/server/auth/auth';
import { authErrorMessage, isHttpControlFlow } from '$lib/server/auth/errors';

export const load: PageServerLoad = async ({ locals, url }) => {
  if (!locals.user) {
    throw redirect(303, '/login');
  }

  return {
    justConfigured: url.searchParams.get('enabled') === '1',
    welcome: url.searchParams.get('welcome') === '1'
  };
};

export const actions: Actions = {
  enable: async (event) => {
    if (!event.locals.user) {
      throw redirect(303, '/login');
    }

    const formData = await event.request.formData();
    const password = String(formData.get('password') ?? '');

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
    const code = String(formData.get('code') ?? '').trim();
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
    const password = String(formData.get('password') ?? '');

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
    const password = String(formData.get('password') ?? '');

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
        message: 'Two-factor authentication is now disabled.'
      };
    } catch (error) {
      return fail(400, {
        stage: 'disable',
        message: authErrorMessage(error, 'Could not disable two-factor authentication.')
      });
    }
  }
};
