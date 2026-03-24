import { describe, expect, it, vi } from 'vitest';
import { APIError } from 'better-auth/api';

vi.mock('$lib/server/auth/auth', () => ({
  createAuth: vi.fn()
}));

vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn(async (value: string) => `data:${value}`)
  }
}));

import { actions, load } from './+page.server';
import { createAuth } from '$lib/server/auth/auth';

function makeEvent(form: Record<string, string>, withUser = true) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(form)) formData.set(key, value);

  const request = new Request('https://example.test/settings/security', { method: 'POST' });
  Object.defineProperty(request, 'formData', {
    value: vi.fn(async () => formData)
  });

  return {
    request,
    locals: {
      authTablesReady: true,
      authSetupComplete: true,
      session: null,
      user: withUser ? ({ id: 'u1', email: 'a@example.test' } as App.Locals['user']) : null
    },
    url: new URL('https://example.test/settings/security')
  } as Parameters<typeof actions.enable>[0] & { request: Request };
}

describe('settings/security page', () => {
  it('redirects unauthenticated loads to login', async () => {
    await expect(
      load({
        locals: {
          authTablesReady: true,
          authSetupComplete: true,
          session: null,
          user: null
        },
        url: new URL('https://example.test/settings/security')
      } as Parameters<typeof load>[0])
    ).rejects.toMatchObject({ status: 303, location: '/login' });
  });

  it('returns welcome/config flags for authenticated users', async () => {
    const result = await load({
      locals: {
        authTablesReady: true,
        authSetupComplete: true,
        session: null,
        user: { id: 'u1' } as App.Locals['user']
      },
      url: new URL('https://example.test/settings/security?enabled=1&welcome=1')
    } as Parameters<typeof load>[0]);

    expect(result).toEqual({ justConfigured: true, welcome: true });
  });

  it('redirects unauthenticated actions to login', async () => {
    await expect(actions.enable(makeEvent({ password: 'secretsecret' }, false))).rejects.toMatchObject({
      status: 303,
      location: '/login'
    });
  });

  it('starts two-factor setup and returns QR data', async () => {
    vi.mocked(createAuth).mockReturnValue({
      api: {
        enableTwoFactor: vi.fn().mockResolvedValue({
          backupCodes: ['code-1'],
          totpURI: 'otpauth://demo'
        })
      }
    } as never);

    const result = await actions.enable(makeEvent({ password: 'secretsecret' }));

    expect(result).toMatchObject({
      stage: 'enable',
      backupCodes: ['code-1'],
      qrCodeDataUrl: 'data:otpauth://demo',
      totpUri: 'otpauth://demo'
    });
  });

  it('redirects after successful verify step', async () => {
    vi.mocked(createAuth).mockReturnValue({
      api: { verifyTOTP: vi.fn().mockResolvedValue({}) }
    } as never);

    await expect(actions.verify(makeEvent({ code: '123456' }))).rejects.toMatchObject({
      status: 303,
      location: '/settings/security?enabled=1'
    });
  });

  it('returns api error messages for verify failures', async () => {
    vi.mocked(createAuth).mockReturnValue({
      api: {
        verifyTOTP: vi.fn().mockRejectedValue(
          new APIError('UNAUTHORIZED', { message: 'Invalid authenticator code.' })
        )
      }
    } as never);

    const result = await actions.verify(makeEvent({ code: '123456' }));

    expect(result).toMatchObject({
      status: 400,
      data: { stage: 'verify', message: 'Invalid authenticator code.' }
    });
  });

  it('returns regenerated backup codes', async () => {
    vi.mocked(createAuth).mockReturnValue({
      api: {
        generateBackupCodes: vi.fn().mockResolvedValue({ backupCodes: ['new-code'] })
      }
    } as never);

    const result = await actions.regenerate(makeEvent({ password: 'secretsecret' }));

    expect(result).toMatchObject({
      stage: 'regenerate',
      backupCodes: ['new-code']
    });
  });

  it('returns confirmation when disabling two-factor', async () => {
    vi.mocked(createAuth).mockReturnValue({
      api: {
        disableTwoFactor: vi.fn().mockResolvedValue({})
      }
    } as never);

    const result = await actions.disable(makeEvent({ password: 'secretsecret' }));

    expect(result).toMatchObject({
      stage: 'disable',
      message: 'Two-factor authentication is now disabled.'
    });
  });
});
