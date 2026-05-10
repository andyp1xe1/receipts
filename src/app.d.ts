/// <reference types="@cloudflare/workers-types" />

import type { AuthSession } from '$lib/server/auth/auth';

declare global {
  namespace App {
    interface Platform {
      env: {
        DB: D1Database;
        BETTER_AUTH_SECRET?: string;
        BETTER_AUTH_URL?: string;
        SETUP_TOKEN?: string;
      };
    }

    type LocalUser = { kind: 'local' };
    type RemoteUser = { kind: 'remote' } & AuthSession['user'];
    type AppUser = LocalUser | RemoteUser;

    interface Locals {
      authSetupComplete: boolean;
      authTablesReady: boolean;
      session: AuthSession['session'] | null;
      user: AppUser | null;
    }
  }
}

export {};
