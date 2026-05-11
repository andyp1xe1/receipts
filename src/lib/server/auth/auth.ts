import { env as privateEnv } from '$env/dynamic/private';
import { getRequestEvent } from '$app/server';
import type { RequestEvent } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { betterAuth } from 'better-auth';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { twoFactor } from 'better-auth/plugins/two-factor';
import { AuthConfigurationError } from '$lib/server/auth/errors';
import { hashPassword, verifyPassword } from '$lib/server/auth/password';
import { countAuthUsers } from '$lib/server/auth/state';
import { getDb } from '$lib/server/db/db';
import { authSchema } from '$lib/server/db/schema';

const textEncoder = new TextEncoder();

export function getAuthSecret(event: RequestEvent): string | null {
  const secret = event.platform?.env.BETTER_AUTH_SECRET ?? privateEnv.BETTER_AUTH_SECRET;
  return secret?.trim() ? secret : null;
}

function requireSecret(event: RequestEvent): string {
  const secret = getAuthSecret(event);
  if (!secret) {
    throw new AuthConfigurationError('BETTER_AUTH_SECRET is required');
  }

  return secret;
}

export function getSetupToken(event: RequestEvent): string | null {
  const token = event.platform?.env.SETUP_TOKEN ?? privateEnv.SETUP_TOKEN;
  return token?.trim() ? token : null;
}

function constantTimeEqual(a: string, b: string): boolean {
  const left = textEncoder.encode(a);
  const right = textEncoder.encode(b);
  const maxLength = Math.max(left.length, right.length);
  let mismatch = left.length === right.length ? 0 : 1;

  for (let index = 0; index < maxLength; index += 1) {
    mismatch |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }

  return mismatch === 0;
}

export function createAuth(event: RequestEvent) {
  if (!event.platform?.env.DB) {
    throw new AuthConfigurationError('Cloudflare D1 binding is not available');
  }

  const db = getDb(event.platform);

  return betterAuth({
    appName: 'Receipt Ledger',
    baseURL: event.platform?.env.BETTER_AUTH_URL ?? privateEnv.BETTER_AUTH_URL ?? event.url.origin,
    secret: requireSecret(event),
    database: drizzleAdapter(db, {
      provider: 'sqlite',
      schema: authSchema
    }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: false,
      minPasswordLength: 12,
      password: { hash: hashPassword, verify: verifyPassword }
    },
    session: {
      cookieCache: { enabled: true, maxAge: 300 }
    },
    trustedOrigins: [event.url.origin],
    advanced: {
      useSecureCookies: event.url.protocol === 'https:',
      ipAddress: {
        ipAddressHeaders: ['cf-connecting-ip', 'x-forwarded-for']
      }
    },
    hooks: {
      before: async (ctx) => {
        if ((ctx as { path?: string }).path !== '/sign-up/email') return;

        const existingUsers = await countAuthUsers(event.platform);
        if (existingUsers > 0) {
          throw new APIError('FORBIDDEN', {
            message: 'Sign up is disabled after the first account is created.'
          });
        }

        const setupToken = getSetupToken(event);
        if (!setupToken) {
          throw new APIError('FORBIDDEN', {
            message: 'SETUP_TOKEN must be configured before creating the first account.'
          });
        }

        if (!constantTimeEqual(new Headers(ctx.headers).get('x-setup-token') ?? '', setupToken)) {
          throw new APIError('FORBIDDEN', {
            message: 'A valid setup token is required to create the first account.'
          });
        }
      }
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            const existingUsers = await countAuthUsers(event.platform);
            if (existingUsers === 0) {
              return { data: { ...user, role: 'ADMIN' } };
            }
            return { data: user };
          }
        }
      }
    },
    plugins: [twoFactor({ issuer: 'Receipt Ledger' }), sveltekitCookies(getRequestEvent)]
  });
}

export type AuthSession = NonNullable<
  Awaited<ReturnType<ReturnType<typeof createAuth>['api']['getSession']>>
>;
