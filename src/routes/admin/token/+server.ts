import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAuthSecret } from '$lib/server/auth/auth';
import { ADMIN_ROLE, TOKEN_TTL_SECONDS, issueApiToken } from '$lib/server/api/jwt';

export const POST: RequestHandler = async (event) => {
  if (event.locals.user?.kind !== 'remote') {
    return json({ error: 'Sign in required' }, { status: 401 });
  }

  const role = (event.locals.user as { role?: string }).role;
  if (role !== ADMIN_ROLE) {
    return json({ error: 'Admin role required' }, { status: 403 });
  }

  const secret = getAuthSecret(event);
  if (!secret) {
    return json({ error: 'Auth secret is not configured' }, { status: 503 });
  }

  const { token, payload } = await issueApiToken(secret, {
    role: ADMIN_ROLE,
    subject: event.locals.user.id
  });
  return json({ token, expiresIn: TOKEN_TTL_SECONDS, role: payload.role, sub: payload.sub });
};
