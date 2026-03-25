import type { RequestHandler } from './$types';
import type { ParsedReceipt } from '$lib/types';
import { listReceiptsForExport } from '$lib/server/db/receipts';
import { readExportFilters } from '$lib/server/export/export';

export const GET: RequestHandler = async ({ locals, platform, url }) => {
  if (!locals.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const filters = readExportFilters(url);
  const receipts = await listReceiptsForExport(platform, filters, { limit: filters.limit });

  const payload = {
    exportedAt: new Date().toISOString(),
    filters: {
      month: filters.month ?? null,
      category: filters.category ?? null,
      from: filters.from ?? null,
      to: filters.to ?? null,
      limit: filters.limit ?? null
    },
    count: receipts.length,
    receipts: receipts.map((r) => {
      const parsed = JSON.parse(r.rawJson) as ParsedReceipt;

      return {
        id: r.id,
        sourceUrl: r.sourceUrl,
        canonicalKey: {
          eccId: r.eccId,
          urlTotal: r.urlTotal,
          urlReceiptNumber: r.urlReceiptNumber,
          urlDate: r.urlDate
        },
        date: r.urlDate,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        merchantName: r.merchantName,
        merchantTaxId: r.merchantTaxId,
        receiptNumber: r.urlReceiptNumber,
        eccId: r.eccId,
        total: r.total,
        subtotal: parsed.subtotal,
        category: r.category || 'Unsorted',
        note: r.note,
        issuedAt: r.issuedAt,
        printedNumber: parsed.printedNumber,
        deviceNumber: parsed.deviceNumber,
        merchant: parsed.merchant,
        items: parsed.items,
        taxes: parsed.taxes,
        payments: parsed.payments,
        rawLines: parsed.rawLines,
        asciiReceipt: parsed.asciiReceipt,
        rawJson: parsed
      };
    })
  };

  const filename = `receipts-${filters.month || filters.from || 'all'}.json`;
  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`
    }
  });
};
