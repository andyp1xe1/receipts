import type { RequestHandler } from './$types';
import { createApiApp, type ApiBindings } from '$lib/server/api/app';
import { getAuthSecret } from '$lib/server/auth/auth';

const app = createApiApp();

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

const handler: RequestHandler = (event) => {
  if (!event.platform?.env.DB) {
    return jsonError(503, 'API requires the remote backend');
  }

  const secret = getAuthSecret(event);
  if (!secret) {
    return jsonError(503, 'API auth secret is not configured');
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
