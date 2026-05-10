import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchAndParseReceipt, parseReceiptText } from './mev';
import { syntheticReceiptCorpus, type SyntheticReceiptFixture } from './synthetic-corpus';

function requestUrl(input: RequestInfo | URL): string {
  return typeof input === 'string' || input instanceof URL ? input.toString() : input.url;
}

function assertReceiptMatchesFixture(fixture: SyntheticReceiptFixture) {
  const receipt = parseReceiptText(fixture.body, fixture.sourceUrl);

  expect(receipt.merchant.name).toBe(fixture.expected.merchantName);
  expect(receipt.merchant.taxId).toBe(fixture.expected.taxId);
  expect(receipt.eccId).toBe(fixture.expected.eccId);
  expect(receipt.urlTotal).toBe(fixture.expected.urlTotal);
  expect(receipt.urlReceiptNumber).toBe(fixture.expected.urlReceiptNumber);
  expect(receipt.urlDate).toBe(fixture.expected.urlDate);
  expect(receipt.issuedAt).toBe(fixture.expected.issuedAt);
  expect(receipt.printedNumber).toBe(fixture.expected.printedNumber);
  expect(receipt.deviceNumber).toBe(fixture.expected.deviceNumber);
  expect(receipt.total).toBe(fixture.expected.total);
  expect(receipt.subtotal).toBe(fixture.expected.subtotal);
  expect(receipt.items).toEqual(fixture.expected.items);
  expect(receipt.payments.cashGiven).toBe(fixture.expected.payments.cashGiven);
  expect(receipt.payments.card).toBe(fixture.expected.payments.card);
  expect(receipt.payments.change).toBe(fixture.expected.payments.change);
  expect(receipt.taxes.map((tax) => tax.label)).toEqual(fixture.expected.taxLabels);

  return receipt;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('parseReceiptText', () => {
  for (const fixture of syntheticReceiptCorpus) {
    it(`parses ${fixture.id}`, () => {
      assertReceiptMatchesFixture(fixture);
    });
  }

  it('renders ASCII-only thermal output for the synthetic corpus', () => {
    for (const fixture of syntheticReceiptCorpus) {
      const receipt = parseReceiptText(fixture.body, fixture.sourceUrl);

      expect(/^[\x00-\x7F]*$/.test(receipt.asciiReceipt)).toBe(true);
      expect(receipt.asciiReceipt).toContain(fixture.expected.merchantName);
      expect(receipt.asciiReceipt).toContain(`NUMARUL DE INREGISTRARE: ${fixture.expected.eccId}`);
      expect(receipt.asciiReceipt).toContain('ID BON');
      expect(receipt.asciiReceipt).toContain('BON FISCAL');
      expect(receipt.asciiReceipt).toContain('--------------------------------');
    }
  });
});

describe('fetchAndParseReceipt', () => {
  it('falls back to the mirrored MEV host for receipt lookups', async () => {
    const sourceUrl = 'https://sift-mev.sfs.md/receipt/SYNTHFOOD08/45.00/102374/2026-04-21';
    const fallbackUrl = 'https://mev.sfs.md/receipt-verifier/SYNTHFOOD08/45.00/102374/2026-04-21';
    const fixture = syntheticReceiptCorpus.find(({ id }) => id === 'terminal-snack-eight-percent');

    if (!fixture) {
      throw new Error('Synthetic fixture missing: terminal-snack-eight-percent');
    }

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
      const url = requestUrl(input);

      if (url === sourceUrl) {
        return new Response('missing', { status: 404 });
      }

      if (url === fallbackUrl) {
        return new Response(fixture.body, { status: 200 });
      }

      return new Response('unexpected', { status: 500 });
    });

    const receipt = await fetchAndParseReceipt(sourceUrl);

    expect(receipt.eccId).toBe(fixture.expected.eccId);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
