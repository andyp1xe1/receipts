import { normalizeReceiptSource } from '$lib/utils/receipt-source';

export interface ReceiptUrlMetadata {
  sourceUrl: string;
  eccId: string;
  urlTotal: string;
  urlReceiptNumber: string;
  urlDate: string;
}

const pathPattern =
  /^\/(?:receipt|receipt-verifier)\/(?<ecc>[^/]+)\/(?<total>[^/]+)\/(?<receipt>[^/]+)\/(?<date>\d{4}-\d{2}-\d{2})\/?$/;

export function parseReceiptUrl(input: string): ReceiptUrlMetadata | null {
  const sourceUrl = normalizeReceiptSource(input);
  if (!sourceUrl) return null;

  const url = new URL(sourceUrl);
  const match = url.pathname.match(pathPattern);
  if (!match?.groups) return null;

  return {
    sourceUrl,
    eccId: decodeURIComponent(match.groups.ecc),
    urlTotal: decodeURIComponent(match.groups.total),
    urlReceiptNumber: decodeURIComponent(match.groups.receipt),
    urlDate: match.groups.date
  };
}
