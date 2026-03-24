import { describe, expect, it, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { AuthConfigurationError } from '$lib/server/auth/errors';

vi.mock('$lib/server/auth/auth', () => ({
  createAuth: vi.fn()
}));

vi.mock('$lib/server/auth/state', () => ({
  authTablesReady: vi.fn(),
  countAuthUsers: vi.fn()
}));

import { handle } from './hooks.server';
import { createAuth } from '$lib/server/auth/auth';
import { authTablesReady, countAuthUsers } from '$lib/server/auth/state';

function makeEvent(pathname: string, method = 'GET'): RequestEvent {
  return {
    url: new URL(`https://example.test${pathname}`),
    request: new Request(`https://example.test${pathname}`, { method }),
    platform: {
      env: {
        DB: {} as D1Database,
        BETTER_AUTH_SECRET: 'secret',
        SETUP_TOKEN: 'setup-token'
      }
    },
    locals: {} as App.Locals
  } as RequestEvent;
}

describe('auth protection handle', () => {
  it('redirects unauthenticated protected pages to login', async () => {
    vi.mocked(authTablesReady).mockResolvedValue(true);
    vi.mocked(countAuthUsers).mockResolvedValue(1);
    vi.mocked(createAuth).mockReturnValue({
      api: { getSession: vi.fn().mockResolvedValue(null) }
    } as never);

    await expect(
      handle({ event: makeEvent('/'), resolve: vi.fn() } as Parameters<typeof handle>[0])
    ).rejects.toMatchObject({ status: 303, location: '/login' });
  });

  it('redirects unauthenticated protected actions to login', async () => {
    vi.mocked(authTablesReady).mockResolvedValue(true);
    vi.mocked(countAuthUsers).mockResolvedValue(1);
    vi.mocked(createAuth).mockReturnValue({
      api: { getSession: vi.fn().mockResolvedValue(null) }
    } as never);

    await expect(
      handle({ event: makeEvent('/', 'POST'), resolve: vi.fn() } as Parameters<typeof handle>[0])
    ).rejects.toMatchObject({ status: 303, location: '/login' });
  });

  it('returns 401 for unauthenticated protected api routes', async () => {
    vi.mocked(authTablesReady).mockResolvedValue(true);
    vi.mocked(countAuthUsers).mockResolvedValue(1);
    vi.mocked(createAuth).mockReturnValue({
      api: { getSession: vi.fn().mockResolvedValue(null) }
    } as never);

    const response = await handle({
      event: makeEvent('/api/export/preview'),
      resolve: vi.fn()
    } as Parameters<typeof handle>[0]);

    expect(response.status).toBe(401);
    expect(await response.text()).toBe('Unauthorized');
  });

  it('redirects to setup when auth tables exist but no account is configured', async () => {
    vi.mocked(authTablesReady).mockResolvedValue(true);
    vi.mocked(countAuthUsers).mockResolvedValue(0);

    await expect(
      handle({ event: makeEvent('/'), resolve: vi.fn() } as Parameters<typeof handle>[0])
    ).rejects.toMatchObject({ status: 303, location: '/setup' });
  });

  it('returns a safe 503 for auth api routes when auth config is missing', async () => {
    vi.mocked(authTablesReady).mockResolvedValue(true);
    vi.mocked(countAuthUsers).mockResolvedValue(1);
    vi.mocked(createAuth).mockImplementation(() => {
      throw new AuthConfigurationError('BETTER_AUTH_SECRET is required');
    });

    const response = await handle({
      event: makeEvent('/api/auth/sign-in/email', 'POST'),
      resolve: vi.fn()
    } as Parameters<typeof handle>[0]);

    expect(response.status).toBe(503);
    expect(await response.text()).toBe('Authentication is temporarily unavailable.');
  });

  it('redirects protected pages to login with a safe auth-unavailable hint', async () => {
    vi.mocked(authTablesReady).mockResolvedValue(true);
    vi.mocked(countAuthUsers).mockResolvedValue(1);
    vi.mocked(createAuth).mockReturnValue({
      api: {
        getSession: vi.fn().mockRejectedValue(new AuthConfigurationError('BETTER_AUTH_SECRET is required'))
      }
    } as never);

    await expect(
      handle({ event: makeEvent('/'), resolve: vi.fn() } as Parameters<typeof handle>[0])
    ).rejects.toMatchObject({ status: 303, location: '/login?auth=unavailable' });
  });

  it('lets public login page render when auth is unavailable', async () => {
    vi.mocked(authTablesReady).mockResolvedValue(true);
    vi.mocked(countAuthUsers).mockResolvedValue(1);
    vi.mocked(createAuth).mockReturnValue({
      api: {
        getSession: vi.fn().mockRejectedValue(new AuthConfigurationError('BETTER_AUTH_SECRET is required'))
      }
    } as never);

    const response = await handle({
      event: makeEvent('/login?auth=unavailable'),
      resolve: vi.fn(async () => new Response('ok'))
    } as Parameters<typeof handle>[0]);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('ok');
  });
});
