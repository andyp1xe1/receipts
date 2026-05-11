import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ParsedReceipt, ReceiptRecord } from '$lib/types';
import { slugCategory } from '$lib/utils/format';

export interface ExportFilters {
  month?: string | null;
  category?: string | null;
  from?: string | null;
  to?: string | null;
  limit?: number | null;
  pdfMode?: 'compact' | 'full';
}

export function readExportFiltersFromUrl(url: URL): ExportFilters {
  const limitParam = url.searchParams.get('limit');
  const parsedLimit = limitParam && limitParam !== 'all' ? Number.parseInt(limitParam, 10) : null;
  const pdfModeParam = url.searchParams.get('pdf_mode');

  return {
    month: emptyToNull(url.searchParams.get('month')),
    category: emptyToNull(url.searchParams.get('category')),
    from: emptyToNull(url.searchParams.get('from')),
    to: emptyToNull(url.searchParams.get('to')),
    limit: Number.isFinite(parsedLimit) && parsedLimit && parsedLimit > 0 ? parsedLimit : null,
    pdfMode: pdfModeParam === 'full' ? 'full' : 'compact'
  };
}

function emptyToNull(value: string | null): string | null {
  return value && value.trim() ? value : null;
}

function escapeCsv(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

export function exportFilename(filters: ExportFilters, ext: string, suffix?: string): string {
  const stem = filters.month || filters.from || 'all';
  const tail = suffix ? `-${suffix}` : '';
  return `receipts-${stem}${tail}.${ext}`;
}

export function toCsv(records: ReceiptRecord[]): string {
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

  for (const receipt of records) {
    const parsed = JSON.parse(receipt.rawJson) as ParsedReceipt;
    const otherPayments = Object.entries(parsed.payments.other)
      .map(([label, amount]) => `${label}: ${amount.toFixed(2)}`)
      .join(' | ');
    const items = parsed.items
      .map((item) => `${item.name} x${item.quantity} @ ${item.unitPrice.toFixed(2)} = ${item.total.toFixed(2)}`)
      .join(' | ');

    lines.push(
      [
        receipt.urlDate,
        receipt.issuedAt || '',
        receipt.merchantName,
        receipt.merchantTaxId || '',
        receipt.eccId,
        receipt.urlReceiptNumber,
        slugCategory(receipt.category),
        receipt.total,
        parsed.subtotal || '',
        parsed.payments.cashGiven?.toFixed(2) || '',
        parsed.payments.card?.toFixed(2) || '',
        parsed.payments.change?.toFixed(2) || '',
        otherPayments,
        String(parsed.items.length),
        items,
        receipt.note || '',
        receipt.sourceUrl
      ]
        .map(escapeCsv)
        .join(',')
    );
  }

  return lines.join('\r\n');
}

export function toJson(records: ReceiptRecord[], filters: ExportFilters): string {
  const payload = {
    exportedAt: new Date().toISOString(),
    filters: {
      month: filters.month ?? null,
      category: filters.category ?? null,
      from: filters.from ?? null,
      to: filters.to ?? null,
      limit: filters.limit ?? null
    },
    count: records.length,
    receipts: records.map((r) => {
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
        category: slugCategory(r.category),
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
  return JSON.stringify(payload, null, 2);
}

export function toPdf(records: ReceiptRecord[], filters: ExportFilters): ArrayBuffer {
  const mode = filters.pdfMode ?? 'compact';
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  doc.setFontSize(16);
  doc.text('Receipt Ledger Export', 40, 44);

  doc.setFontSize(10);
  const filterParts: string[] = [];
  if (filters.month) filterParts.push(`Month: ${filters.month}`);
  if (filters.from) filterParts.push(`From: ${filters.from}`);
  if (filters.to) filterParts.push(`To: ${filters.to}`);
  if (filters.category) filterParts.push(`Category: ${filters.category}`);
  if (filters.limit) filterParts.push(`Limit: ${filters.limit}`);
  filterParts.push(`Mode: ${mode}`);
  doc.text(filterParts.length ? filterParts.join(' | ') : 'All receipts', 40, 62);

  const totalSpend = records.reduce((sum, receipt) => sum + Number(receipt.total), 0);
  doc.text(`${records.length} receipts | Total ${totalSpend.toFixed(2)} MDL`, 40, 78);

  const headStyles = {
    fillColor: [30, 27, 24] as [number, number, number],
    textColor: [237, 231, 222] as [number, number, number],
    lineColor: [50, 45, 40] as [number, number, number],
    lineWidth: 1,
    fontStyle: 'bold' as const
  };
  const bodyStyles = {
    textColor: [32, 30, 28] as [number, number, number],
    lineColor: [214, 208, 201] as [number, number, number],
    lineWidth: 0.5,
    fontSize: 9,
    cellPadding: 6
  };
  const alternateRowStyles = { fillColor: [250, 248, 245] as [number, number, number] };

  if (mode === 'full') {
    autoTable(doc, {
      startY: 94,
      theme: 'plain',
      head: [['Date', 'Merchant / Item', 'Receipt #', 'Category', 'Qty', 'Total (MDL)']],
      body: records.flatMap((receipt) => {
        const parsed = JSON.parse(receipt.rawJson) as ParsedReceipt;
        return [
          [
            receipt.urlDate,
            `${receipt.merchantName}${receipt.note ? `\n${receipt.note}` : ''}`,
            receipt.urlReceiptNumber,
            slugCategory(receipt.category),
            '',
            Number(receipt.total).toFixed(2)
          ],
          ...parsed.items.map((item) => [
            '',
            `  ${item.name}`,
            '',
            '',
            String(item.quantity),
            item.total.toFixed(2)
          ])
        ];
      }),
      headStyles,
      bodyStyles: { ...bodyStyles, valign: 'middle' },
      alternateRowStyles,
      columnStyles: {
        0: { cellWidth: 64 },
        1: { cellWidth: 220 },
        2: { cellWidth: 58 },
        3: { cellWidth: 72 },
        4: { cellWidth: 36, halign: 'right' },
        5: { cellWidth: 70, halign: 'right' }
      },
      didParseCell: (hook) => {
        if (hook.section !== 'body') return;
        const row = hook.row.raw as string[];
        const isItemRow = row[0] === '';
        if (!isItemRow) {
          hook.cell.styles.fillColor = [244, 239, 233];
          hook.cell.styles.fontStyle = 'bold';
        }
      }
    });
  } else {
    autoTable(doc, {
      startY: 94,
      theme: 'plain',
      head: [['Date', 'Merchant', 'Receipt #', 'Category', 'Total (MDL)']],
      body: records.map((receipt) => [
        receipt.urlDate,
        receipt.merchantName,
        receipt.urlReceiptNumber,
        slugCategory(receipt.category),
        Number(receipt.total).toFixed(2)
      ]),
      headStyles,
      bodyStyles,
      alternateRowStyles,
      columnStyles: { 4: { halign: 'right' } }
    });
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(`Generated ${new Date().toISOString()} | Page ${i}/${pageCount}`, 40, 810);
  }

  return doc.output('arraybuffer');
}
