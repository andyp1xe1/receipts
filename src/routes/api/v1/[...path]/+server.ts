import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createApiApp, type ApiBindings } from '$lib/server/api/app';
import { getAuthSecret } from '$lib/server/auth/auth';

const app = createApiApp();

const handler: RequestHandler = (event) => {
  if (!event.platform?.env.DB) {
    return json({ error: 'API requires the remote backend' }, { status: 503 });
  }

  const secret = getAuthSecret(event);
  if (!secret) {
    return json({ error: 'API auth secret is not configured' }, { status: 503 });
  }

  const env: ApiBindings = { SECRET: secret, PLATFORM: event.platform };
  return app.fetch(event.request, env);
};

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
export const OPTIONS = handler;
