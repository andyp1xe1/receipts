import { describe, expect, it, vi } from 'vitest';
import { APIError } from 'better-auth/api';

vi.mock('$lib/server/auth/auth', () => ({
  createAuth: vi.fn()
}));

import { actions, load } from './+page.server';
import { createAuth } from '$lib/server/auth/auth';

function makeEvent(form: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(form)) formData.set(key, value);

  const request = new Request('https://example.test/two-factor', { method: 'POST' });
  Object.defineProperty(request, 'formData', {
    value: vi.fn(async () => formData)
  });

  return {
    request,
    cookies: {
      get: vi.fn((name: string) => (name === 'better-auth.two_factor' ? 'pending' : undefined))
    },
    locals: {
      authTablesReady: true,
      authSetupComplete: true,
      session: null,
      user: null
    },
    url: new URL('https://example.test/two-factor')
  } as unknown as Parameters<typeof actions.verifyTotp>[0] & { request: Request };
}

describe('two-factor page', () => {
  it('redirects authenticated users away from the page', async () => {
    await expect(
      load({
        cookies: { get: vi.fn() },
        locals: {
          authTablesReady: true,
          authSetupComplete: true,
          session: null,
          user: { id: 'u1' }
        }
      } as unknown as Parameters<typeof load>[0])
    ).rejects.toMatchObject({ status: 303, location: '/' });
  });

  it('redirects to login when no two-factor challenge is pending', async () => {
    await expect(
      load({
        cookies: { get: vi.fn(() => undefined) },
        locals: {
          authTablesReady: true,
          authSetupComplete: true,
          session: null,
          user: null
        }
      } as unknown as Parameters<typeof load>[0])
    ).rejects.toMatchObject({ status: 303, location: '/login' });
  });

  it('validates missing totp code', async () => {
    const result = await actions.verifyTotp(makeEvent({ code: '' }));

    expect(result).toMatchObject({
      status: 400,
      data: { type: 'totp', message: 'Enter the 6-digit code from your authenticator app.' }
    });
  });

  it('redirects after successful totp verification', async () => {
    vi.mocked(createAuth).mockReturnValue({
      api: { verifyTOTP: vi.fn().mockResolvedValue({}) }
    } as never);

    await expect(actions.verifyTotp(makeEvent({ code: '123456', trust_device: 'on' }))).rejects.toMatchObject({
      status: 303,
      location: '/'
    });
  });

  it('surfaces api totp failures', async () => {
    vi.mocked(createAuth).mockReturnValue({
      api: {
        verifyTOTP: vi.fn().mockRejectedValue(
          new APIError('UNAUTHORIZED', { message: 'Invalid authenticator code.' })
        )
      }
    } as never);

    const result = await actions.verifyTotp(makeEvent({ code: '123456' }));

    expect(result).toMatchObject({
      status: 400,
      data: { type: 'totp', message: 'Invalid authenticator code.' }
    });
  });

  it('validates missing backup code', async () => {
    const result = await actions.verifyBackupCode(makeEvent({ backup_code: '' }));

    expect(result).toMatchObject({
      status: 400,
      data: { type: 'backup', message: 'Enter one of your saved backup codes.' }
    });
  });

  it('redirects after successful backup code verification', async () => {
    vi.mocked(createAuth).mockReturnValue({
      api: { verifyBackupCode: vi.fn().mockResolvedValue({}) }
    } as never);

    await expect(actions.verifyBackupCode(makeEvent({ backup_code: 'abc-123' }))).rejects.toMatchObject({
      status: 303,
      location: '/'
    });
  });
});
