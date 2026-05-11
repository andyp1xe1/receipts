import { describe, expect, it } from 'vitest';
import { createApiApp, type ApiBindings } from './app';
import { TOKEN_TTL_SECONDS, issueApiToken, verifyApiToken } from './jwt';

const SECRET = 'test-secret-for-jwt-signing-please-ignore-1234567890';

function makeEnv(): ApiBindings {
  return { SECRET, PLATFORM: {} as App.Platform };
}

describe('jwt helpers', () => {
  it('issues and verifies a token with role and sub', async () => {
    const { token, payload } = await issueApiToken(SECRET, { role: 'ADMIN' });
    expect(payload.role).toBe('ADMIN');
    expect(payload.sub).toBe('demo:ADMIN');
    expect(payload.exp - payload.iat).toBe(TOKEN_TTL_SECONDS);

    const result = await verifyApiToken(SECRET, `Bearer ${token}`);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.payload.role).toBe('ADMIN');
  });

  it('honors an explicit subject', async () => {
    const { payload } = await issueApiToken(SECRET, { role: 'USER', subject: 'user_abc123' });
    expect(payload.sub).toBe('user_abc123');
  });

  it('reports missing token', async () => {
    expect(await verifyApiToken(SECRET, undefined)).toEqual({ ok: false, reason: 'missing' });
    expect(await verifyApiToken(SECRET, 'NotBearer xyz')).toEqual({ ok: false, reason: 'missing' });
  });

  it('rejects a token signed with a different secret', async () => {
    const { token } = await issueApiToken(SECRET, { role: 'ADMIN' });
    const result = await verifyApiToken('different-secret', `Bearer ${token}`);
    expect(result.ok).toBe(false);
  });
});

describe('api app', () => {
  it('POST /api/v1/token issues a JWT from a JSON body', async () => {
    const app = createApiApp();
    const res = await app.request(
      '/api/v1/token',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ role: 'ADMIN' })
      },
      makeEnv()
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      token: string;
      role: string;
      sub: string;
      expiresIn: number;
    };
    expect(body.role).toBe('ADMIN');
    expect(body.sub).toBe('demo:ADMIN');
    expect(body.expiresIn).toBe(TOKEN_TTL_SECONDS);
    expect(typeof body.token).toBe('string');
  });

  it('GET /api/v1/token issues a JWT from query parameters', async () => {
    const app = createApiApp();
    const res = await app.request('/api/v1/token?role=USER', undefined, makeEnv());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { role: string; sub: string };
    expect(body.role).toBe('USER');
    expect(body.sub).toBe('demo:USER');
  });

  it('GET /api/v1/receipts returns 401 without a bearer token', async () => {
    const app = createApiApp();
    const res = await app.request('/api/v1/receipts', undefined, makeEnv());
    expect(res.status).toBe(401);
  });

  it('GET /api/v1/admin/users returns 401 without a token', async () => {
    const app = createApiApp();
    const res = await app.request('/api/v1/admin/users', undefined, makeEnv());
    expect(res.status).toBe(401);
  });

  it('GET /api/v1/admin/users returns 403 for a non-admin token', async () => {
    const app = createApiApp();
    const { token } = await issueApiToken(SECRET, { role: 'USER' });
    const res = await app.request(
      '/api/v1/admin/users',
      { headers: { authorization: `Bearer ${token}` } },
      makeEnv()
    );
    expect(res.status).toBe(403);
  });

  it('serves an OpenAPI spec at /api/v1/openapi.json', async () => {
    const app = createApiApp();
    const res = await app.request('/api/v1/openapi.json', undefined, makeEnv());
    expect(res.status).toBe(200);
    const spec = (await res.json()) as { paths: Record<string, unknown> };
    expect(spec.paths['/api/v1/token']).toBeDefined();
    expect(spec.paths['/api/v1/receipts']).toBeDefined();
    expect(spec.paths['/api/v1/receipts/{id}']).toBeDefined();
  });
});
