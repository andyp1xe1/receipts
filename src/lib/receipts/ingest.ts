import type { ParsedReceipt } from '$lib/types';
import { parseReceiptUrl, type ReceiptUrlMetadata } from './qr-url';

export interface ManualReceiptInput {
  merchantName: string;
  total: string;
  urlDate: string;
  category?: string | null;
  note?: string | null;
}

function emptyReceipt(): Omit<ParsedReceipt, 'sourceUrl' | 'eccId' | 'urlTotal' | 'urlReceiptNumber' | 'urlDate' | 'total'> {
  return {
    merchant: { name: '', taxId: '', address: '' },
    issuedAt: null,
    printedNumber: null,
    deviceNumber: null,
    items: [],
    subtotal: null,
    taxes: [],
    payments: { cashGiven: null, card: null, change: null, other: {} },
    rawLines: [],
    asciiReceipt: ''
  };
}

export function synthesizeFromUrl(metadata: ReceiptUrlMetadata): ParsedReceipt {
  return {
    ...emptyReceipt(),
    sourceUrl: metadata.sourceUrl,
    eccId: metadata.eccId,
    urlTotal: metadata.urlTotal,
    urlReceiptNumber: metadata.urlReceiptNumber,
    urlDate: metadata.urlDate,
    total: metadata.urlTotal,
    issuedAt: `${metadata.urlDate}T00:00:00`
  };
}

export function tryIngestUrl(input: string): ParsedReceipt | null {
  const metadata = parseReceiptUrl(input);
  return metadata ? synthesizeFromUrl(metadata) : null;
}

export function synthesizeManual(input: ManualReceiptInput): ParsedReceipt {
  const total = input.total.trim();
  return {
    ...emptyReceipt(),
    merchant: { name: input.merchantName.trim(), taxId: '', address: '' },
    sourceUrl: '',
    eccId: 'manual',
    urlTotal: total,
    urlReceiptNumber: `manual-${Date.now()}`,
    urlDate: input.urlDate,
    total,
    issuedAt: `${input.urlDate}T00:00:00`
  };
}
