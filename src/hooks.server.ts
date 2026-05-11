import { redirect, type Handle } from '@sveltejs/kit';
import { createAuth, getAuthSecret } from '$lib/server/auth/auth';
import { authUnavailableMessage, isAuthConfigurationError } from '$lib/server/auth/errors';
import { hasLocalSession } from '$lib/server/auth/local-session';
import { authTablesReady, countAuthUsers } from '$lib/server/auth/state';

const PUBLIC_PATHS = new Set(['/about', '/login', '/setup', '/two-factor']);
const REMOTE_ONLY_PATHS = new Set(['/setup', '/two-factor']);

function isStaticPath(pathname: string): boolean {
  return pathname.startsWith('/_app/') || pathname === '/favicon.svg';
}

function isApiPath(pathname: string): boolean {
  return pathname.startsWith('/api/');
}

function isSettingsPath(pathname: string): boolean {
  return pathname.startsWith('/settings/');
}

export const handle: Handle = async ({ event, resolve }) => {
  const { pathname } = event.url;
  const hasRemoteBackend = !!event.platform?.env.DB;

  event.locals.authSecretConfigured = !!getAuthSecret(event);
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

  if (hasLocalSession(event.cookies)) {
    event.locals.user = { kind: 'local' };

    if (isApiPath(pathname)) {
      return new Response('Local mode does not use server APIs.', { status: 400 });
    }

    if (pathname === '/login' || REMOTE_ONLY_PATHS.has(pathname) || isSettingsPath(pathname)) {
      throw redirect(303, '/');
    }

    return resolve(event);
  }

  if (!hasRemoteBackend) {
    if (pathname === '/login' || pathname === '/about') return resolve(event);
    throw redirect(303, '/about');
  }

  if (event.locals.authTablesReady && event.locals.authSecretConfigured) {
    try {
      const session = await createAuth(event).api.getSession({
        headers: event.request.headers
      });

      if (session) {
        event.locals.session = session.session;
        event.locals.user = { kind: 'remote', ...session.user };
      }
    } catch (error) {
      if (isAuthConfigurationError(error)) {
        if (isApiPath(pathname)) {
          return new Response(authUnavailableMessage(), { status: 503 });
        }

        if (!PUBLIC_PATHS.has(pathname)) {
          throw redirect(303, '/login');
        }
      } else {
        throw error;
      }
    }
  }

  if (pathname === '/setup' && event.locals.authSetupComplete) {
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

    throw redirect(303, '/about');
  }

  return resolve(event);
};
