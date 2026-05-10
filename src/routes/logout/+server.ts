import { redirect, type RequestHandler } from '@sveltejs/kit';
import { createAuth } from '$lib/server/auth/auth';
import { clearLocalSession, hasLocalSession } from '$lib/server/auth/local-session';

export const POST: RequestHandler = async (event) => {
  if (hasLocalSession(event.cookies)) {
    clearLocalSession(event.cookies);
    throw redirect(303, '/login');
  }

  if (event.locals.authTablesReady) {
    await createAuth(event).api.signOut({
      headers: event.request.headers
    });
  }

  throw redirect(303, '/login');
};
