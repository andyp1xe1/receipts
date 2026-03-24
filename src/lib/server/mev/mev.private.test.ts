import { describe, expect, it } from 'vitest';

import { fetchAndParseReceipt } from './mev';
import { loadPrivateReceiptCorpus } from './private-receipt-corpus';

const corpus = loadPrivateReceiptCorpus();

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
        const parts = entry.source_url.replace(/\/+$/, '').split('/').slice(-4);

        expect(receipt.eccId).toBe(parts[0]);
        expect(receipt.urlTotal).toBe(parts[1]);
        expect(receipt.urlReceiptNumber).toBe(String(Number(parts[2])));
        expect(receipt.urlDate).toBe(parts[3]);
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
      const url = entry.source_url;

      expect(entry.kind === 'four_part' || entry.kind === 'opaque_lookup').toBe(true);
      expect(url.includes('/receipt/') || url.includes('/receipt-verifier/')).toBe(true);

      if (entry.kind === 'four_part') {
        expect(url.replace(/\/+$/, '').split('/').slice(-4)).toHaveLength(4);
        continue;
      }

      const token = url.replace(/\/+$/, '').split('/').at(-1);
      expect(token).toBeTruthy();
    }
  });
});
