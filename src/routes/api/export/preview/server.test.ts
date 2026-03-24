import { describe, expect, it, vi } from 'vitest';

vi.mock('$lib/server/db/receipts', () => ({
  countReceipts: vi.fn()
}));

import { GET } from './+server';
import { countReceipts } from '$lib/server/db/receipts';

describe('export preview api', () => {
  it('returns 401 when the request is unauthenticated', async () => {
    const response = await GET({
      locals: { user: null },
      platform: undefined,
      url: new URL('https://example.test/api/export/preview')
    } as Parameters<typeof GET>[0]);

    expect(response.status).toBe(401);
    expect(await response.text()).toBe('Unauthorized');
  });

  it('returns total and limited counts with parsed filters', async () => {
    vi.mocked(countReceipts).mockResolvedValue(42);

    const response = await GET({
      locals: { user: { id: 'u1' } },
      platform: undefined,
      url: new URL('https://example.test/api/export/preview?month=2026-03&category=Fuel&limit=10')
    } as Parameters<typeof GET>[0]);

    expect(countReceipts).toHaveBeenCalledWith(undefined, {
      month: '2026-03',
      category: 'Fuel',
      from: null,
      to: null,
      limit: 10,
      pdfMode: 'compact'
    });
    expect(response.headers.get('Content-Type')).toBe('application/json; charset=utf-8');
    await expect(response.json()).resolves.toEqual({ total: 42, limited: 10 });
  });

  it('treats `limit=all` as unbounded', async () => {
    vi.mocked(countReceipts).mockResolvedValue(7);

    const response = await GET({
      locals: { user: { id: 'u1' } },
      platform: undefined,
      url: new URL('https://example.test/api/export/preview?limit=all')
    } as Parameters<typeof GET>[0]);

    expect(countReceipts).toHaveBeenCalledWith(undefined, {
      month: null,
      category: null,
      from: null,
      to: null,
      limit: null,
      pdfMode: 'compact'
    });
    await expect(response.json()).resolves.toEqual({ total: 7, limited: 7 });
  });

  it('ignores invalid limits and honors full pdf mode', async () => {
    vi.mocked(countReceipts).mockResolvedValue(12);

    const response = await GET({
      locals: { user: { id: 'u1' } },
      platform: undefined,
      url: new URL('https://example.test/api/export/preview?limit=0&pdf_mode=full&from=2026-01-01&to=2026-01-31')
    } as Parameters<typeof GET>[0]);

    expect(countReceipts).toHaveBeenCalledWith(undefined, {
      month: null,
      category: null,
      from: '2026-01-01',
      to: '2026-01-31',
      limit: null,
      pdfMode: 'full'
    });
    await expect(response.json()).resolves.toEqual({ total: 12, limited: 12 });
  });
});
