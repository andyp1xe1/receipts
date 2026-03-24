import { describe, expect, it, vi } from 'vitest';
import { APIError } from 'better-auth/api';

vi.mock('$lib/server/auth/auth', () => ({
  createAuth: vi.fn()
}));

import { actions, load } from './+page.server';
import { createAuth } from '$lib/server/auth/auth';

function makeEvent(form: Record<string, string>, locals?: Partial<App.Locals>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(form)) formData.set(key, value);

  const request = new Request('https://example.test/login', { method: 'POST' });
  Object.defineProperty(request, 'formData', {
    value: vi.fn(async () => formData)
  });

  return {
    request,
    locals: {
      authTablesReady: true,
      authSetupComplete: true,
      session: null,
      user: null,
      ...locals
    },
    url: new URL('https://example.test/login')
  } as Parameters<typeof actions.default>[0] & { request: Request };
}

describe('login page', () => {
  it('shows auth-unavailable hint from the query string', async () => {
    const result = await load({
      locals: {
        authTablesReady: true,
        authSetupComplete: true,
        session: null,
        user: null
      },
      url: new URL('https://example.test/login?auth=unavailable')
    } as Parameters<typeof load>[0]);

    expect(result).toEqual({ migrated: true, authUnavailable: true });
  });

  it('fails safely when auth tables are not ready', async () => {
    const result = await actions.default(makeEvent({}, { authTablesReady: false }));

    expect(result).toMatchObject({
      status: 503,
      data: { message: 'Run the auth migration before signing in.' }
    });
  });

  it('validates missing credentials before touching auth', async () => {
    const result = await actions.default(makeEvent({ email: '', password: '' }));

    expect(result).toMatchObject({
      status: 400,
      data: { message: 'Enter your email and password.' }
    });
    expect(createAuth).not.toHaveBeenCalled();
  });

  it('redirects to two-factor when sign-in requires it', async () => {
    vi.mocked(createAuth).mockReturnValue({
      api: {
        signInEmail: vi.fn().mockResolvedValue({ twoFactorRedirect: true })
      }
    } as never);

    await expect(actions.default(makeEvent({ email: 'a@example.test', password: 'secretsecret' }))).rejects.toMatchObject({
      status: 303,
      location: '/two-factor'
    });
  });

  it('returns a safe message for auth configuration failures', async () => {
    vi.mocked(createAuth).mockImplementation(() => {
      throw new Error('BETTER_AUTH_SECRET is required');
    });

    const result = await actions.default(makeEvent({ email: 'a@example.test', password: 'secretsecret' }));

    expect(result).toMatchObject({
      status: 400,
      data: { message: 'Could not sign in.' }
    });
  });

  it('surfaces API auth failures without leaking server internals', async () => {
    vi.mocked(createAuth).mockReturnValue({
      api: {
        signInEmail: vi.fn().mockRejectedValue(
          new APIError('UNAUTHORIZED', {
            message: 'Invalid email or password.'
          })
        )
      }
    } as never);

    const result = await actions.default(makeEvent({ email: 'a@example.test', password: 'secretsecret' }));

    expect(result).toMatchObject({
      status: 400,
      data: { message: 'Invalid email or password.' }
    });
  });
});
