import { fail, redirect, type ActionFailure } from '@sveltejs/kit';

type RequireOk = { ok: true; userId: string; user: App.RemoteUser };
type RequireFail = { ok: false; failure: ActionFailure<{ type: 'error'; message: string }> };

export function requireRemoteUser(
  locals: App.Locals,
  localModeMessage = 'Local mode handles this in the browser.'
): RequireOk | RequireFail {
  if (locals.user?.kind === 'local') {
    return { ok: false, failure: fail(400, { type: 'error', message: localModeMessage }) };
  }
  if (locals.user?.kind !== 'remote') {
    return { ok: false, failure: fail(401, { type: 'error', message: 'Sign in required.' }) };
  }
  return { ok: true, userId: locals.user.id, user: locals.user };
}

export function redirectIfNotAdmin(locals: App.Locals): { userId: string; user: App.RemoteUser } {
  if (locals.user?.kind === 'local') throw redirect(303, '/');
  if (locals.user?.kind !== 'remote') throw redirect(303, '/login');
  const role = (locals.user as { role?: string }).role;
  if (role !== 'ADMIN') throw redirect(303, '/');
  return { userId: locals.user.id, user: locals.user };
}
