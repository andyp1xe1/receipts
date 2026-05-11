import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createAuth, getSetupToken } from '$lib/server/auth/auth';
import { authErrorMessage, isHttpControlFlow } from '$lib/server/auth/errors';
import { getFormString } from '$lib/server/forms';

export const load: PageServerLoad = async ({ locals, platform, request, url }) => {
  if (locals.authSetupComplete) {
    throw redirect(303, locals.user ? '/' : '/login');
  }

  const eventLike = {
    platform,
    request
  } as Parameters<typeof getSetupToken>[0];

  return {
    setupTokenConfigured: Boolean(getSetupToken(eventLike)),
    authSecretConfigured: locals.authSecretConfigured,
    migrated: locals.authTablesReady,
    migrateHint: url.searchParams.get('migrate') === '1'
  };
};

export const actions: Actions = {
  default: async (event) => {
    if (!event.locals.authTablesReady) {
      return fail(503, {
        message: 'Run the auth migration before creating the first account.'
      });
    }

    if (event.locals.authSetupComplete) {
      throw redirect(303, '/login');
    }

    if (!event.locals.authSecretConfigured) {
      return fail(503, {
        message: 'Set BETTER_AUTH_SECRET before creating the first account.'
      });
    }

    const setupToken = getSetupToken(event);
    if (!setupToken) {
      return fail(503, {
        message: 'Set SETUP_TOKEN before creating the first account.'
      });
    }

    const formData = await event.request.formData();
    const name = getFormString(formData, 'name').trim();
    const email = getFormString(formData, 'email').trim().toLowerCase();
    const password = getFormString(formData, 'password');
    const providedSetupToken = getFormString(formData, 'setup_token');

    if (!name || !email || !password || !providedSetupToken) {
      return fail(400, {
        message: 'Enter a name, email, password, and setup token.',
        values: { name, email }
      });
    }

    try {
      const auth = createAuth(event);
      const headers = new Headers(event.request.headers);
      headers.set('x-setup-token', providedSetupToken);

      await auth.api.signUpEmail({
        body: { name, email, password },
        headers
      });

      await auth.api.signInEmail({
        body: { email, password },
        headers: event.request.headers
      });

      throw redirect(303, '/settings/security?welcome=1');
    } catch (error) {
      if (isHttpControlFlow(error)) throw error;

      return fail(400, {
        message: authErrorMessage(error, 'Could not create the first account.'),
        values: { name, email }
      });
    }
  }
};
