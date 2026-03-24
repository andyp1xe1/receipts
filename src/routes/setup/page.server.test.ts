import { describe, expect, it, vi } from 'vitest';
import { APIError } from 'better-auth/api';

vi.mock('$lib/server/auth/auth', () => ({
  createAuth: vi.fn(),
  getSetupToken: vi.fn()
}));

import { actions, load } from './+page.server';
import { createAuth, getSetupToken } from '$lib/server/auth/auth';

function makeEvent(form: Record<string, string>, locals?: Partial<App.Locals>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(form)) formData.set(key, value);

  const request = new Request('https://example.test/setup', { method: 'POST' });
  Object.defineProperty(request, 'formData', {
    value: vi.fn(async () => formData)
  });

  return {
    request,
    locals: {
      authTablesReady: true,
      authSetupComplete: false,
      session: null,
      user: null,
      ...locals
    },
    platform: {
      env: {
        DB: {} as D1Database,
        SETUP_TOKEN: 'setup-token',
        BETTER_AUTH_SECRET: 'secret'
      }
    },
    url: new URL('https://example.test/setup')
  } as Parameters<typeof actions.default>[0] & { request: Request };
}

describe('setup page', () => {
  it('reports whether the setup token is configured', async () => {
    vi.mocked(getSetupToken).mockReturnValue('setup-token');

    const request = new Request('https://example.test/setup');
    const result = await load({
      locals: {
        authTablesReady: true,
        authSetupComplete: false,
        session: null,
        user: null
      },
      platform: { env: { DB: {} as D1Database, SETUP_TOKEN: 'setup-token' } },
      request,
      url: new URL('https://example.test/setup?migrate=1')
    } as Parameters<typeof load>[0]);

    expect(result).toEqual({
      setupTokenConfigured: true,
      migrated: true,
      migrateHint: true
    });
  });

  it('fails safely when setup token is missing', async () => {
    vi.mocked(getSetupToken).mockReturnValue(null);

    const result = await actions.default(makeEvent({}));

    expect(result).toMatchObject({
      status: 503,
      data: { message: 'Set SETUP_TOKEN before creating the first account.' }
    });
  });

  it('validates missing fields before calling auth', async () => {
    vi.mocked(getSetupToken).mockReturnValue('setup-token');

    const result = await actions.default(
      makeEvent({ name: '', email: '', password: '', setup_token: '' })
    );

    expect(result).toMatchObject({
      status: 400,
      data: { message: 'Enter a name, email, password, and setup token.' }
    });
    expect(createAuth).not.toHaveBeenCalled();
  });

  it('forwards the provided setup token to signup', async () => {
    vi.mocked(getSetupToken).mockReturnValue('expected-token');
    const signUpEmail = vi.fn().mockResolvedValue({});
    vi.mocked(createAuth).mockReturnValue({
      api: { signUpEmail }
    } as never);

    await expect(
      actions.default(
        makeEvent({
          name: 'Admin',
          email: 'admin@example.test',
          password: 'secretsecret',
          setup_token: 'provided-token'
        })
      )
    ).rejects.toMatchObject({ status: 303, location: '/settings/security?welcome=1' });

    const call = signUpEmail.mock.calls[0][0] as { headers: Headers; body: { email: string } };
    expect(call.body.email).toBe('admin@example.test');
    expect(call.headers.get('x-setup-token')).toBe('provided-token');
  });

  it('surfaces invalid setup token errors without leaking config details', async () => {
    vi.mocked(getSetupToken).mockReturnValue('expected-token');
    vi.mocked(createAuth).mockReturnValue({
      api: {
        signUpEmail: vi.fn().mockRejectedValue(
          new APIError('FORBIDDEN', {
            message: 'A valid setup token is required to create the first account.'
          })
        )
      }
    } as never);

    const result = await actions.default(
      makeEvent({
        name: 'Admin',
        email: 'admin@example.test',
        password: 'secretsecret',
        setup_token: 'wrong-token'
      })
    );

    expect(result).toMatchObject({
      status: 400,
      data: { message: 'A valid setup token is required to create the first account.' }
    });
  });
});
