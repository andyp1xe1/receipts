import { redirect, type RequestHandler } from '@sveltejs/kit';
import { createAuth } from '$lib/server/auth/auth';

export const POST: RequestHandler = async (event) => {
  if (event.locals.authTablesReady) {
    await createAuth(event).api.signOut({
      headers: event.request.headers
    });
  }

  throw redirect(303, '/login');
};
