import type { RequestHandler } from './$types';
import type { ParsedReceipt } from '$lib/types';
import { readExportFilters } from '$lib/server/export';
import { listReceiptsForExport } from '$lib/server/db';

function escapeCsv(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export const GET: RequestHandler = async ({ platform, url }) => {
  const filters = readExportFilters(url);
  const receipts = await listReceiptsForExport(platform, filters, { limit: filters.limit });

  const headers = [
    'Date',
    'Issued At',
    'Merchant',
    'Merchant Tax ID',
    'ECC ID',
    'Receipt #',
    'Category',
    'Total (MDL)',
    'Subtotal (MDL)',
    'Cash Given',
    'Card',
    'Change',
    'Other Payments',
    'Item Count',
    'Items',
    'Note',
    'Source URL'
  ];
  const lines = [headers.map(escapeCsv).join(',')];

  for (const receipt of receipts) {
    const parsed = JSON.parse(receipt.raw_json) as ParsedReceipt;
    const otherPayments = Object.entries(parsed.payments.other)
      .map(([label, amount]) => `${label}: ${amount.toFixed(2)}`)
      .join(' | ');
    const items = parsed.items
      .map((item) => `${item.name} x${item.quantity} @ ${item.unitPrice.toFixed(2)} = ${item.total.toFixed(2)}`)
      .join(' | ');

    lines.push(
      [
        receipt.url_date,
        receipt.issued_at || '',
        receipt.merchant_name,
        receipt.merchant_tax_id || '',
        receipt.ecc_id,
        receipt.url_receipt_number,
        receipt.category || 'Unsorted',
        receipt.total,
        parsed.subtotal || '',
        parsed.payments.cashGiven?.toFixed(2) || '',
        parsed.payments.card?.toFixed(2) || '',
        parsed.payments.change?.toFixed(2) || '',
        otherPayments,
        String(parsed.items.length),
        items,
        receipt.note || '',
        receipt.source_url
      ]
        .map(escapeCsv)
        .join(',')
    );
  }

  const filename = `receipts-${filters.month || filters.from || 'all'}.csv`;
  return new Response(lines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`
    }
  });
};
