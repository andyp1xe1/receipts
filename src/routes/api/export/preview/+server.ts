import type { RequestHandler } from './$types';
import { countReceipts } from '$lib/server/db/receipts';
import { readExportFilters } from '$lib/server/export/export';

export const GET: RequestHandler = async ({ platform, url }) => {
  const filters = readExportFilters(url);
  const total = await countReceipts(platform, filters);
  const limited = typeof filters.limit === 'number' ? Math.min(total, filters.limit) : total;

  return new Response(JSON.stringify({ total, limited }), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8'
    }
  });
};
