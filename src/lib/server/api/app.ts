import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import type { Context, MiddlewareHandler } from 'hono';
import {
  deleteReceipt,
  getExistingReceiptByCanonicalKey,
  getReceiptById,
  insertReceipt,
  listReceiptsPaginated,
  updateReceiptMetadata
} from '$lib/server/db/receipts';
import { synthesizeNewReceipt } from '$lib/receipts';
import { banUser, getUserById, listUsers, unbanUser } from '$lib/server/db/users';
import { fetchAndParseReceipt } from '$lib/server/mev/mev';
import { normalizeReceiptSource } from '$lib/utils/receipt-source';
import {
  issueApiToken,
  verifyApiToken,
  type ApiTokenPayload,
  TOKEN_TTL_SECONDS
} from './jwt';

export type ApiBindings = {
  SECRET: string;
  PLATFORM: App.Platform;
};

export type ApiVariables = {
  user: ApiTokenPayload;
};

type Env = { Bindings: ApiBindings; Variables: ApiVariables };

const roleSchema = z.enum(['ADMIN', 'USER']);

const tokenResponseSchema = z.object({
  token: z.string(),
  expiresIn: z.number(),
  role: roleSchema,
  sub: z.string()
});

const errorSchema = z.object({ error: z.string() });

const receiptSummarySchema = z
  .object({
    id: z.string(),
    userId: z.string().nullable(),
    merchantName: z.string(),
    total: z.string(),
    urlDate: z.string(),
    issuedAt: z.string().nullable(),
    category: z.string().nullable(),
    note: z.string().nullable(),
    createdAt: z.string()
  })
  .loose();

const paginatedReceiptsSchema = z.object({
  items: z.array(receiptSummarySchema),
  total: z.number(),
  limit: z.number(),
  skip: z.number()
});

type ErrorStatus = 400 | 401 | 403 | 404 | 409 | 500;

function jsonError<S extends ErrorStatus>(c: Context<Env>, status: S, message: string) {
  return c.json({ error: message }, status);
}

const requireJwt: MiddlewareHandler<Env> = async (c, next) => {
  const result = await verifyApiToken(c.env.SECRET, c.req.header('Authorization'));
  if (!result.ok) {
    const message =
      result.reason === 'expired'
        ? 'Token expired'
        : result.reason === 'missing'
          ? 'Missing bearer token'
          : 'Invalid token';
    return jsonError(c, 401, message);
  }
  c.set('user', result.payload);
  await next();
};

const requireAdmin: MiddlewareHandler<Env> = async (c, next) => {
  const user = c.get('user');
  if (user.role !== 'ADMIN') {
    return jsonError(c, 403, 'Admin role required');
  }
  await next();
};

const tokenIssueRoute = createRoute({
  method: 'post',
  path: '/token',
  tags: ['Auth'],
  summary: 'Issue a demo JWT for API access',
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            role: roleSchema.optional()
          })
        }
      }
    }
  },
  responses: {
    200: { content: { 'application/json': { schema: tokenResponseSchema } }, description: 'Token issued' },
    400: { content: { 'application/json': { schema: errorSchema } }, description: 'Invalid request' }
  }
});

const tokenGetRoute = createRoute({
  method: 'get',
  path: '/token',
  tags: ['Auth'],
  summary: 'Issue a demo JWT via query parameters',
  request: {
    query: z.object({
      role: roleSchema.optional()
    })
  },
  responses: {
    200: { content: { 'application/json': { schema: tokenResponseSchema } }, description: 'Token issued' },
    400: { content: { 'application/json': { schema: errorSchema } }, description: 'Invalid request' }
  }
});

const idParam = {
  params: z.object({
    id: z.string().min(1).openapi({ param: { name: 'id', in: 'path' } })
  })
};

const createReceiptBodySchema = z.object({
  sourceUrl: z.string().min(1),
  category: z.string().nullable().optional(),
  note: z.string().nullable().optional()
});

const createManualReceiptBodySchema = z.object({
  merchantName: z.string().min(1),
  total: z.string().min(1),
  urlDate: z.string().min(1),
  sourceUrl: z.string().optional(),
  category: z.string().nullable().optional(),
  note: z.string().nullable().optional()
});

const updateReceiptBodySchema = z.object({
  category: z.string().nullable().optional(),
  note: z.string().nullable().optional()
});

const duplicateSchema = z.object({
  error: z.string(),
  existingId: z.string()
});

const listReceiptsRoute = createRoute({
  method: 'get',
  path: '/receipts',
  tags: ['Receipts'],
  summary: 'List your receipts (paginated)',
  security: [{ bearerAuth: [] }],
  request: {
    query: z.object({
      limit: z.coerce.number().int().min(1).max(200).optional().default(50),
      skip: z.coerce.number().int().min(0).optional().default(0),
      month: z.string().optional(),
      category: z.string().optional(),
      from: z.string().optional(),
      to: z.string().optional()
    })
  },
  responses: {
    200: { content: { 'application/json': { schema: paginatedReceiptsSchema } }, description: 'Page of receipts' },
    401: { content: { 'application/json': { schema: errorSchema } }, description: 'Unauthorized' }
  }
});

const getReceiptRoute = createRoute({
  method: 'get',
  path: '/receipts/{id}',
  tags: ['Receipts'],
  summary: 'Fetch one of your receipts by id',
  security: [{ bearerAuth: [] }],
  request: idParam,
  responses: {
    200: { content: { 'application/json': { schema: receiptSummarySchema } }, description: 'Receipt' },
    401: { content: { 'application/json': { schema: errorSchema } }, description: 'Unauthorized' },
    404: { content: { 'application/json': { schema: errorSchema } }, description: 'Not found' }
  }
});

const createReceiptRoute = createRoute({
  method: 'post',
  path: '/receipts',
  tags: ['Receipts'],
  summary: 'Import a receipt from a MEV source URL',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: { 'application/json': { schema: createReceiptBodySchema } }
    }
  },
  responses: {
    201: { content: { 'application/json': { schema: receiptSummarySchema } }, description: 'Created' },
    400: { content: { 'application/json': { schema: errorSchema } }, description: 'Invalid request' },
    401: { content: { 'application/json': { schema: errorSchema } }, description: 'Unauthorized' },
    409: { content: { 'application/json': { schema: duplicateSchema } }, description: 'Duplicate receipt' }
  }
});

const createManualReceiptRoute = createRoute({
  method: 'post',
  path: '/receipts/manual',
  tags: ['Receipts'],
  summary: 'Create a receipt from manually entered fields',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: { 'application/json': { schema: createManualReceiptBodySchema } }
    }
  },
  responses: {
    201: { content: { 'application/json': { schema: receiptSummarySchema } }, description: 'Created' },
    400: { content: { 'application/json': { schema: errorSchema } }, description: 'Invalid request' },
    401: { content: { 'application/json': { schema: errorSchema } }, description: 'Unauthorized' },
    409: { content: { 'application/json': { schema: duplicateSchema } }, description: 'Duplicate receipt' }
  }
});

const updateReceiptRoute = createRoute({
  method: 'put',
  path: '/receipts/{id}',
  tags: ['Receipts'],
  summary: 'Update receipt metadata (category, note)',
  security: [{ bearerAuth: [] }],
  request: {
    ...idParam,
    body: {
      content: { 'application/json': { schema: updateReceiptBodySchema } }
    }
  },
  responses: {
    200: { content: { 'application/json': { schema: receiptSummarySchema } }, description: 'Updated' },
    401: { content: { 'application/json': { schema: errorSchema } }, description: 'Unauthorized' },
    404: { content: { 'application/json': { schema: errorSchema } }, description: 'Not found' }
  }
});

const adminUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.string(),
  banned: z.boolean(),
  banReason: z.string().nullable(),
  banExpires: z.number().nullable(),
  createdAt: z.number()
});

const adminUsersResponseSchema = z.object({
  items: z.array(adminUserSchema),
  total: z.number(),
  limit: z.number(),
  skip: z.number()
});

const banBodySchema = z.object({
  reason: z.string().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional()
});

const adminListUsersRoute = createRoute({
  method: 'get',
  path: '/admin/users',
  tags: ['Admin'],
  summary: 'List users (admin only)',
  security: [{ bearerAuth: [] }],
  request: {
    query: z.object({
      limit: z.coerce.number().int().min(1).max(200).optional().default(50),
      skip: z.coerce.number().int().min(0).optional().default(0)
    })
  },
  responses: {
    200: { content: { 'application/json': { schema: adminUsersResponseSchema } }, description: 'Users' },
    401: { content: { 'application/json': { schema: errorSchema } }, description: 'Unauthorized' },
    403: { content: { 'application/json': { schema: errorSchema } }, description: 'Forbidden' }
  }
});

const adminBanUserRoute = createRoute({
  method: 'post',
  path: '/admin/users/{id}/ban',
  tags: ['Admin'],
  summary: 'Ban a user (admin only)',
  security: [{ bearerAuth: [] }],
  request: {
    ...idParam,
    body: {
      content: { 'application/json': { schema: banBodySchema } }
    }
  },
  responses: {
    200: { content: { 'application/json': { schema: adminUserSchema } }, description: 'Banned' },
    401: { content: { 'application/json': { schema: errorSchema } }, description: 'Unauthorized' },
    403: { content: { 'application/json': { schema: errorSchema } }, description: 'Forbidden' },
    404: { content: { 'application/json': { schema: errorSchema } }, description: 'Not found' }
  }
});

const adminUnbanUserRoute = createRoute({
  method: 'post',
  path: '/admin/users/{id}/unban',
  tags: ['Admin'],
  summary: 'Unban a user (admin only)',
  security: [{ bearerAuth: [] }],
  request: idParam,
  responses: {
    200: { content: { 'application/json': { schema: adminUserSchema } }, description: 'Unbanned' },
    401: { content: { 'application/json': { schema: errorSchema } }, description: 'Unauthorized' },
    403: { content: { 'application/json': { schema: errorSchema } }, description: 'Forbidden' },
    404: { content: { 'application/json': { schema: errorSchema } }, description: 'Not found' }
  }
});

const deleteReceiptRoute = createRoute({
  method: 'delete',
  path: '/receipts/{id}',
  tags: ['Receipts'],
  summary: 'Delete one of your receipts',
  security: [{ bearerAuth: [] }],
  request: idParam,
  responses: {
    204: { description: 'Deleted' },
    401: { content: { 'application/json': { schema: errorSchema } }, description: 'Unauthorized' },
    404: { content: { 'application/json': { schema: errorSchema } }, description: 'Not found' }
  }
});

export const API_BASE_PATH = '/api/v1';

export function createApiApp() {
  const app = new OpenAPIHono<Env>().basePath(API_BASE_PATH);

  app.openAPIRegistry.registerComponent('securitySchemes', 'bearerAuth', {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT'
  });

  app.openapi(tokenIssueRoute, async (c) => {
    const body = c.req.valid('json');
    const { token, payload } = await issueApiToken(c.env.SECRET, { role: body.role });
    return c.json({ token, expiresIn: TOKEN_TTL_SECONDS, role: payload.role, sub: payload.sub }, 200);
  });

  app.openapi(tokenGetRoute, async (c) => {
    const query = c.req.valid('query');
    const { token, payload } = await issueApiToken(c.env.SECRET, { role: query.role });
    return c.json({ token, expiresIn: TOKEN_TTL_SECONDS, role: payload.role, sub: payload.sub }, 200);
  });

  app.use('/receipts/*', requireJwt);
  app.use('/receipts', requireJwt);

  app.openapi(listReceiptsRoute, async (c) => {
    const user = c.get('user');
    const { limit, skip, month, category, from, to } = c.req.valid('query');
    const { items, total } = await listReceiptsPaginated(
      c.env.PLATFORM,
      user.sub,
      { month, category, from, to },
      { limit, skip }
    );
    return c.json({ items, total, limit, skip }, 200);
  });

  app.openapi(getReceiptRoute, async (c) => {
    const user = c.get('user');
    const { id } = c.req.valid('param');
    const receipt = await getReceiptById(c.env.PLATFORM, user.sub, id);
    if (!receipt) return jsonError(c, 404, 'Receipt not found');
    return c.json(receipt, 200);
  });

  app.openapi(createReceiptRoute, async (c) => {
    const user = c.get('user');
    const { sourceUrl, category, note } = c.req.valid('json');
    const normalizedSourceUrl = normalizeReceiptSource(sourceUrl);
    if (!normalizedSourceUrl) {
      return jsonError(c, 400, 'Paste or scan a full MEV receipt URL.');
    }

    let parsed: Awaited<ReturnType<typeof fetchAndParseReceipt>>;
    try {
      parsed = await fetchAndParseReceipt(normalizedSourceUrl);
    } catch (error) {
      return jsonError(c, 400, error instanceof Error ? error.message : 'Receipt import failed.');
    }

    const existing = await getExistingReceiptByCanonicalKey(c.env.PLATFORM, user.sub, parsed);
    if (existing) {
      return c.json({ error: 'Receipt already imported', existingId: existing.id }, 409);
    }

    const id = await insertReceipt(c.env.PLATFORM, user.sub, parsed, {
      category: category ?? null,
      note: note ?? null
    });
    const created = await getReceiptById(c.env.PLATFORM, user.sub, id);
    if (!created) throw new Error('Receipt was inserted but could not be read back');
    return c.json(created, 201);
  });

  app.openapi(createManualReceiptRoute, async (c) => {
    const user = c.get('user');
    const { merchantName, total, urlDate, sourceUrl, category, note } = c.req.valid('json');
    const parsed = synthesizeNewReceipt({
      merchantName,
      total,
      urlDate,
      sourceUrl: sourceUrl?.trim() || undefined
    });
    const existing = await getExistingReceiptByCanonicalKey(c.env.PLATFORM, user.sub, parsed);
    if (existing) {
      return c.json({ error: 'Receipt already imported', existingId: existing.id }, 409);
    }
    const id = await insertReceipt(c.env.PLATFORM, user.sub, parsed, {
      category: category ?? null,
      note: note ?? null
    });
    const created = await getReceiptById(c.env.PLATFORM, user.sub, id);
    if (!created) throw new Error('Receipt was inserted but could not be read back');
    return c.json(created, 201);
  });

  app.openapi(updateReceiptRoute, async (c) => {
    const user = c.get('user');
    const { id } = c.req.valid('param');
    const body = c.req.valid('json');
    const existing = await getReceiptById(c.env.PLATFORM, user.sub, id);
    if (!existing) return jsonError(c, 404, 'Receipt not found');
    await updateReceiptMetadata(c.env.PLATFORM, user.sub, {
      id,
      category: body.category ?? null,
      note: body.note ?? null
    });
    const updated = await getReceiptById(c.env.PLATFORM, user.sub, id);
    if (!updated) return jsonError(c, 404, 'Receipt not found');
    return c.json(updated, 200);
  });

  app.openapi(deleteReceiptRoute, async (c) => {
    const user = c.get('user');
    const { id } = c.req.valid('param');
    const existing = await getReceiptById(c.env.PLATFORM, user.sub, id);
    if (!existing) return jsonError(c, 404, 'Receipt not found');
    await deleteReceipt(c.env.PLATFORM, user.sub, id);
    return c.body(null, 204);
  });

  app.use('/admin/*', requireJwt, requireAdmin);

  app.openapi(adminListUsersRoute, async (c) => {
    const { limit, skip } = c.req.valid('query');
    const { items, total } = await listUsers(c.env.PLATFORM, { limit, skip });
    return c.json({ items, total, limit, skip }, 200);
  });

  app.openapi(adminBanUserRoute, async (c) => {
    const { id } = c.req.valid('param');
    const { reason, expiresAt } = c.req.valid('json');
    const existing = await getUserById(c.env.PLATFORM, id);
    if (!existing) return jsonError(c, 404, 'User not found');
    await banUser(c.env.PLATFORM, id, reason ?? null, expiresAt ? new Date(expiresAt) : null);
    const updated = await getUserById(c.env.PLATFORM, id);
    if (!updated) return jsonError(c, 404, 'User not found');
    return c.json(updated, 200);
  });

  app.openapi(adminUnbanUserRoute, async (c) => {
    const { id } = c.req.valid('param');
    const existing = await getUserById(c.env.PLATFORM, id);
    if (!existing) return jsonError(c, 404, 'User not found');
    await unbanUser(c.env.PLATFORM, id);
    const updated = await getUserById(c.env.PLATFORM, id);
    if (!updated) return jsonError(c, 404, 'User not found');
    return c.json(updated, 200);
  });

  app.doc('/openapi.json', {
    openapi: '3.1.0',
    info: { title: 'Receipts API', version: '1.0.0' }
  });

  app.onError((err, c) => {
    console.error('[api]', err);
    return jsonError(c, 500, 'Internal server error');
  });

  return app;
}

export type ApiApp = ReturnType<typeof createApiApp>;
