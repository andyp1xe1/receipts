import type { RequestHandler } from './$types';
import type { ParsedReceipt } from '$lib/types';
import { listReceiptsForExport } from '$lib/server/db/receipts';
import { readExportFilters } from '$lib/server/export/export';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const GET: RequestHandler = async ({ platform, url }) => {
  const filters = readExportFilters(url);
  const receipts = await listReceiptsForExport(platform, filters, { limit: filters.limit });
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
  filterParts.push(`Mode: ${filters.pdfMode}`);
  doc.text(filterParts.length ? filterParts.join(' | ') : 'All receipts', 40, 62);

  const totalSpend = receipts.reduce((sum, receipt) => sum + Number(receipt.total), 0);
  doc.text(`${receipts.length} receipts | Total ${totalSpend.toFixed(2)} MDL`, 40, 78);

  if (filters.pdfMode === 'full') {
    autoTable(doc, {
      startY: 94,
      theme: 'plain',
      head: [['Date', 'Merchant / Item', 'Receipt #', 'Category', 'Qty', 'Total (MDL)']],
      body: receipts.flatMap((receipt) => {
        const parsed = JSON.parse(receipt.rawJson) as ParsedReceipt;

        return [
          [
            receipt.urlDate,
            `${receipt.merchantName}${receipt.note ? `\n${receipt.note}` : ''}`,
            receipt.urlReceiptNumber,
            receipt.category || 'Unsorted',
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
      headStyles: {
        fillColor: [30, 27, 24],
        textColor: [237, 231, 222],
        lineColor: [50, 45, 40],
        lineWidth: 1,
        fontStyle: 'bold'
      },
      bodyStyles: {
        textColor: [32, 30, 28],
        lineColor: [214, 208, 201],
        lineWidth: 0.5,
        fontSize: 9,
        cellPadding: 6,
        valign: 'middle'
      },
      alternateRowStyles: {
        fillColor: [250, 248, 245]
      },
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
      body: receipts.map((receipt) => [
        receipt.urlDate,
        receipt.merchantName,
        receipt.urlReceiptNumber,
        receipt.category || 'Unsorted',
        Number(receipt.total).toFixed(2)
      ]),
      headStyles: {
        fillColor: [30, 27, 24],
        textColor: [237, 231, 222],
        lineColor: [50, 45, 40],
        lineWidth: 1,
        fontStyle: 'bold'
      },
      bodyStyles: {
        textColor: [32, 30, 28],
        lineColor: [214, 208, 201],
        lineWidth: 0.5,
        fontSize: 9,
        cellPadding: 6
      },
      alternateRowStyles: {
        fillColor: [250, 248, 245]
      },
      columnStyles: {
        4: { halign: 'right' }
      }
    });
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(`Generated ${new Date().toISOString()} | Page ${i}/${pageCount}`, 40, 810);
  }

  const pdfBuffer = doc.output('arraybuffer');
  const filename = `receipts-${filters.month || filters.from || 'all'}-${filters.pdfMode}.pdf`;
  return new Response(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`
    }
  });
};
