import { describe, expect, it } from 'vitest';

import { fetchAndParseReceipt } from './mev';
import { loadPrivateReceiptCorpus } from './private-receipt-corpus';

const corpus = loadPrivateReceiptCorpus();

function assertFourPartTuple(sourceUrl: string, receipt: Awaited<ReturnType<typeof fetchAndParseReceipt>>) {
  const parts = sourceUrl.replace(/\/+$/, '').split('/').slice(-4);

  expect(receipt.eccId).toBe(parts[0]);
  expect(receipt.urlTotal).toBe(parts[1]);
  expect(receipt.urlReceiptNumber).toBe(String(Number(parts[2])));
  expect(receipt.urlDate).toBe(parts[3]);
}

function assertKnownUrlShape(kind: 'four_part' | 'opaque_lookup' | undefined, sourceUrl: string) {
  expect(kind === 'four_part' || kind === 'opaque_lookup').toBe(true);
  expect(sourceUrl.includes('/receipt/') || sourceUrl.includes('/receipt-verifier/')).toBe(true);

  const segments = sourceUrl.replace(/\/+$/, '').split('/');
  const hasValidTail = kind === 'four_part' ? segments.slice(-4).length === 4 : Boolean(segments.at(-1));

  expect(hasValidTail).toBe(true);
}

describe.skipIf(!corpus)('private MEV receipt corpus', () => {
  it('round-trips the canonical receipt invariants', async () => {
    for (const entry of corpus ?? []) {
      const receipt = await fetchAndParseReceipt(entry.source_url);

      expect(receipt.sourceUrl).toBe(entry.source_url);
      expect(receipt.eccId).toBeTruthy();
      expect(receipt.urlTotal).not.toBeNull();
      expect(receipt.urlReceiptNumber).toBeTruthy();
      expect(receipt.urlDate).toBeTruthy();
      expect(receipt.total).not.toBeNull();
      expect(receipt.issuedAt).not.toBeNull();
      expect(receipt.urlTotal).toBe(receipt.total);
      expect(receipt.issuedAt?.slice(0, 10)).toBe(receipt.urlDate);

      if (entry.kind === 'four_part') {
        assertFourPartTuple(entry.source_url, receipt);
      }
    }
  }, 15000);

  it('reconstructs canonical tuples for opaque lookup receipts from content', async () => {
    for (const entry of corpus?.filter(({ kind }) => kind === 'opaque_lookup') ?? []) {
      const receipt = await fetchAndParseReceipt(entry.source_url);

      expect(receipt.eccId).toBeTruthy();
      expect(receipt.urlTotal).toBe(receipt.total);
      expect(receipt.urlReceiptNumber).toBe(String(Number(receipt.urlReceiptNumber)));
      expect(receipt.urlDate).toBe(receipt.issuedAt?.slice(0, 10));
    }
  });

  it('uses only known MEV URL shapes', () => {
    for (const entry of corpus ?? []) {
      assertKnownUrlShape(entry.kind, entry.source_url);
    }
  });
});
