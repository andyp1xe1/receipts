import { describe, expect, it } from 'vitest';
import { normalizeReceiptSource } from './receipt-source';

describe('normalizeReceiptSource', () => {
  it('keeps supported receipt urls', () => {
    expect(normalizeReceiptSource('https://example.invalid/receipt-verifier/FAKEECC001/91.37/650321/2028-11-06')).toBe(
      'https://example.invalid/receipt-verifier/FAKEECC001/91.37/650321/2028-11-06'
    );
  });

  it('extracts receipt urls from qr payload text', () => {
    expect(
      normalizeReceiptSource(
        'Scan result: https://example.invalid/receipt/FAKEECC002/63.42/810245/2028-11-09'
      )
    ).toBe('https://example.invalid/receipt/FAKEECC002/63.42/810245/2028-11-09');
  });

  it('decodes url-encoded payloads', () => {
    expect(
      normalizeReceiptSource(
        'https%3A%2F%2Fsift-mev.sfs.md%2Freceipt%2FFAKE-OPAQUE-TOKEN'
      )
    ).toBe('https://example.invalid/receipt/FAKE-OPAQUE-TOKEN');
  });

  it('rejects non-mev urls', () => {
    expect(normalizeReceiptSource('https://example.com/receipt/1')).toBeNull();
  });
});
