import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { AuthConfigurationError } from '$lib/server/auth/errors';

vi.mock('$lib/server/auth/auth', () => ({
  createAuth: vi.fn(),
  getAuthSecret: vi.fn((event: RequestEvent) => event.platform?.env.BETTER_AUTH_SECRET || null)
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
    cookies: { get: vi.fn(() => undefined) } as unknown as RequestEvent['cookies'],
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
  beforeEach(() => {
    vi.mocked(createAuth).mockReset();
  });

  it('redirects unauthenticated protected pages to the landing page', async () => {
    vi.mocked(authTablesReady).mockResolvedValue(true);
    vi.mocked(countAuthUsers).mockResolvedValue(1);
    vi.mocked(createAuth).mockReturnValue({
      api: { getSession: vi.fn().mockResolvedValue(null) }
    } as never);

    await expect(
      handle({ event: makeEvent('/'), resolve: vi.fn() } as Parameters<typeof handle>[0])
    ).rejects.toMatchObject({ status: 303, location: '/about' });
  });

  it('redirects unauthenticated protected actions to the landing page', async () => {
    vi.mocked(authTablesReady).mockResolvedValue(true);
    vi.mocked(countAuthUsers).mockResolvedValue(1);
    vi.mocked(createAuth).mockReturnValue({
      api: { getSession: vi.fn().mockResolvedValue(null) }
    } as never);

    await expect(
      handle({ event: makeEvent('/', 'POST'), resolve: vi.fn() } as Parameters<typeof handle>[0])
    ).rejects.toMatchObject({ status: 303, location: '/about' });
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

  it('still redirects to the landing page when no account exists (setup is opt-in)', async () => {
    vi.mocked(authTablesReady).mockResolvedValue(true);
    vi.mocked(countAuthUsers).mockResolvedValue(0);
    vi.mocked(createAuth).mockReturnValue({
      api: { getSession: vi.fn().mockResolvedValue(null) }
    } as never);

    await expect(
      handle({ event: makeEvent('/'), resolve: vi.fn() } as Parameters<typeof handle>[0])
    ).rejects.toMatchObject({ status: 303, location: '/about' });
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

  it('skips session validation and redirects protected pages to the landing page when secret is missing', async () => {
    vi.mocked(authTablesReady).mockResolvedValue(true);
    vi.mocked(countAuthUsers).mockResolvedValue(1);

    const event = makeEvent('/');
    event.platform!.env.BETTER_AUTH_SECRET = '';

    await expect(
      handle({ event, resolve: vi.fn() } as Parameters<typeof handle>[0])
    ).rejects.toMatchObject({ status: 303, location: '/about' });
    expect(createAuth).not.toHaveBeenCalled();
  });

  it('lets public login page render when the secret is missing', async () => {
    vi.mocked(authTablesReady).mockResolvedValue(true);
    vi.mocked(countAuthUsers).mockResolvedValue(1);

    const event = makeEvent('/login');
    event.platform!.env.BETTER_AUTH_SECRET = '';

    const response = await handle({
      event,
      resolve: vi.fn(async () => new Response('ok'))
    } as Parameters<typeof handle>[0]);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('ok');
  });
});
