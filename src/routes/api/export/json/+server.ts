import type { RequestHandler } from './$types';
import type { ParsedReceipt } from '$lib/types';
import { listReceiptsForExport } from '$lib/server/db';
import { readExportFilters } from '$lib/server/export';

export const GET: RequestHandler = async ({ platform, url }) => {
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
      const parsed = JSON.parse(r.raw_json) as ParsedReceipt;

      return {
        id: r.id,
        sourceUrl: r.source_url,
        canonicalKey: {
          eccId: r.ecc_id,
          urlTotal: r.url_total,
          urlReceiptNumber: r.url_receipt_number,
          urlDate: r.url_date
        },
        date: r.url_date,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        merchantName: r.merchant_name,
        merchantTaxId: r.merchant_tax_id,
        receiptNumber: r.url_receipt_number,
        eccId: r.ecc_id,
        total: r.total,
        subtotal: parsed.subtotal,
        category: r.category || 'Unsorted',
        note: r.note,
        issuedAt: r.issued_at,
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
