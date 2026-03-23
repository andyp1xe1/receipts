const receiptUrlPattern = /https?:\/\/(?:mev|sift-mev)\.sfs\.md\/(?:receipt|receipt-verifier)\/[A-Za-z0-9./_%:-]+/i;

function cleanCandidate(value: string): string {
  return value.trim().replace(/[)>\]}",'`]+$/g, '');
}

function extractReceiptUrl(value: string): string | null {
  const match = value.match(receiptUrlPattern);
  return match ? cleanCandidate(match[0]) : null;
}

function maybeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function isSupportedReceiptPath(pathname: string): boolean {
  return pathname.startsWith('/receipt/') || pathname.startsWith('/receipt-verifier/');
}

export function normalizeReceiptSource(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  for (const candidate of [trimmed, maybeDecode(trimmed)]) {
    const extracted = extractReceiptUrl(candidate) ?? candidate;

    try {
      const url = new URL(cleanCandidate(extracted));
      if (!['mev.sfs.md', 'sift-mev.sfs.md'].includes(url.hostname)) continue;
      if (!isSupportedReceiptPath(url.pathname)) continue;
      url.hash = '';
      return url.toString();
    } catch {
      continue;
    }
  }

  return null;
}
