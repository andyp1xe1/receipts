import { sign, verify } from 'hono/utils/jwt/jwt';
import { JwtTokenExpired, JwtTokenInvalid } from 'hono/utils/jwt/types';

export const ROLES = ['ADMIN', 'USER'] as const;
export type Role = (typeof ROLES)[number];
export const ADMIN_ROLE: Role = 'ADMIN';

export const TOKEN_TTL_SECONDS = 60;

export interface ApiTokenPayload extends Record<string, unknown> {
  sub: string;
  role: Role;
  iat: number;
  exp: number;
}

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

function isApiTokenPayload(value: unknown): value is ApiTokenPayload {
  if (!value || typeof value !== 'object') return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p.sub === 'string' &&
    isRole(p.role) &&
    typeof p.iat === 'number' &&
    typeof p.exp === 'number'
  );
}

export interface IssueTokenInput {
  role?: Role;
  subject?: string;
}

export async function issueApiToken(secret: string, input: IssueTokenInput): Promise<{ token: string; payload: ApiTokenPayload }> {
  const role: Role = input.role ?? 'USER';
  const now = Math.floor(Date.now() / 1000);
  const payload: ApiTokenPayload = {
    sub: input.subject ?? `demo:${role}`,
    role,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS
  };

  const token = await sign(payload, secret, 'HS256');
  return { token, payload };
}

export type VerifyResult =
  | { ok: true; payload: ApiTokenPayload }
  | { ok: false; reason: 'missing' | 'invalid' | 'expired' };

export async function verifyApiToken(secret: string, authHeader: string | undefined | null): Promise<VerifyResult> {
  if (!authHeader) return { ok: false, reason: 'missing' };
  const match = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
  if (!match) return { ok: false, reason: 'missing' };

  try {
    const payload = await verify(match[1], secret, 'HS256');
    if (!isApiTokenPayload(payload)) return { ok: false, reason: 'invalid' };
    return { ok: true, payload };
  } catch (error) {
    if (error instanceof JwtTokenExpired) return { ok: false, reason: 'expired' };
    if (error instanceof JwtTokenInvalid) return { ok: false, reason: 'invalid' };
    return { ok: false, reason: 'invalid' };
  }
}
