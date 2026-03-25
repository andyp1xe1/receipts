import { redirect, type Handle } from '@sveltejs/kit';
import { createAuth } from '$lib/server/auth/auth';
import { authUnavailableMessage, isAuthConfigurationError } from '$lib/server/auth/errors';
import { authTablesReady, countAuthUsers } from '$lib/server/auth/state';

const PUBLIC_PATHS = new Set(['/login', '/setup', '/two-factor']);

function isStaticPath(pathname: string): boolean {
  return pathname.startsWith('/_app/') || pathname === '/favicon.svg';
}

function isApiPath(pathname: string): boolean {
  return pathname.startsWith('/api/');
}

export const handle: Handle = async ({ event, resolve }) => {
  const { pathname } = event.url;

  event.locals.authTablesReady = await authTablesReady(event.platform);
  event.locals.authSetupComplete = event.locals.authTablesReady
    ? (await countAuthUsers(event.platform)) > 0
    : false;
  event.locals.session = null;
  event.locals.user = null;

  if (pathname.startsWith('/api/auth')) {
    if (!event.locals.authTablesReady) {
      return new Response('Run database migrations before using auth routes.', { status: 503 });
    }

    try {
      return createAuth(event).handler(event.request);
    } catch (error) {
      if (isAuthConfigurationError(error)) {
        return new Response(authUnavailableMessage(), { status: 503 });
      }

      throw error;
    }
  }

  if (isStaticPath(pathname)) {
    return resolve(event);
  }

  if (event.locals.authTablesReady) {
    try {
      const session = await createAuth(event).api.getSession({
        headers: event.request.headers
      });

      if (session) {
        event.locals.session = session.session;
        event.locals.user = session.user;
      }
    } catch (error) {
      if (isAuthConfigurationError(error)) {
        if (isApiPath(pathname)) {
          return new Response(authUnavailableMessage(), { status: 503 });
        }

        if (!PUBLIC_PATHS.has(pathname)) {
          throw redirect(303, '/login?auth=unavailable');
        }
      } else {
        throw error;
      }
    }
  }

  if (!event.locals.authTablesReady) {
    if (pathname !== '/setup') {
      throw redirect(303, '/setup?migrate=1');
    }

    return resolve(event);
  }

  if (!event.locals.authSetupComplete) {
    if (pathname !== '/setup') {
      throw redirect(303, '/setup');
    }

    return resolve(event);
  }

  if (pathname === '/setup') {
    throw redirect(303, event.locals.user ? '/' : '/login');
  }

  if ((pathname === '/login' || pathname === '/two-factor') && event.locals.user) {
    throw redirect(303, '/');
  }

  if (PUBLIC_PATHS.has(pathname)) {
    return resolve(event);
  }

  if (!event.locals.user) {
    if (isApiPath(pathname)) {
      return new Response('Unauthorized', { status: 401 });
    }

    throw redirect(303, '/login');
  }

  return resolve(event);
};
