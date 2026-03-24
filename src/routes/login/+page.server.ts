import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createAuth } from '$lib/server/auth/auth';
import { authErrorMessage, isHttpControlFlow } from '$lib/server/auth/errors';

export const load: PageServerLoad = async ({ locals, url }) => {
  if (!locals.authTablesReady) {
    return { migrated: false };
  }

  if (!locals.authSetupComplete) {
    throw redirect(303, '/setup');
  }

  if (locals.user) {
    throw redirect(303, '/');
  }

  return {
    migrated: true,
    authUnavailable: url.searchParams.get('auth') === 'unavailable'
  };
};

export const actions: Actions = {
  default: async (event) => {
    if (!event.locals.authTablesReady) {
      return fail(503, {
        message: 'Run the auth migration before signing in.'
      });
    }

    const formData = await event.request.formData();
    const email = String(formData.get('email') ?? '').trim().toLowerCase();
    const password = String(formData.get('password') ?? '');

    if (!email || !password) {
      return fail(400, {
        message: 'Enter your email and password.',
        values: { email }
      });
    }

    try {
      const auth = createAuth(event);
      const result = await auth.api.signInEmail({
        body: { email, password },
        headers: event.request.headers
      });

      if ('twoFactorRedirect' in result && result.twoFactorRedirect) {
        throw redirect(303, '/two-factor');
      }

      throw redirect(303, '/');
    } catch (error) {
      if (isHttpControlFlow(error)) throw error;

      return fail(400, {
        message: authErrorMessage(error, 'Could not sign in.'),
        values: { email }
      });
    }
  }
};
