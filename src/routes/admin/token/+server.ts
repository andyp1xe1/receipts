import type { RequestHandler } from './$types';
import { getAuthSecret } from '$lib/server/auth/auth';
import { issueApiToken, isRole, type Role } from '$lib/server/api/jwt';

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

export const POST: RequestHandler = async (event) => {
  if (event.locals.user?.kind !== 'remote') {
    return json(401, { error: 'Sign in required' });
  }

  const role = (event.locals.user as { role?: string }).role;
  if (!isRole(role) || role !== 'ADMIN') {
    return json(403, { error: 'Admin role required' });
  }

  const secret = getAuthSecret(event);
  if (!secret) {
    return json(503, { error: 'Auth secret is not configured' });
  }

  const { token, payload } = await issueApiToken(secret, {
    role: role as Role,
    subject: event.locals.user.id
  });
  return json(200, { token, expiresIn: payload.exp - payload.iat, role: payload.role, sub: payload.sub });
};
