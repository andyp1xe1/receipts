import { describe, expect, it } from 'vitest';
import { parseReceiptText } from './mev';

const sourceUrl = 'https://mev.sfs.md/receipt-verifier/FAKEECC001/91.37/650321/2028-11-06';
const opaqueSourceUrl = 'https://sift-mev.sfs.md/receipt/FAKE-OPAQUE-TOKEN';

const sampleText = `
DEMO MARKET SRL
COD FISCAL: 1234567890123
mun. Exemplu, str. Test 1/1
NUMARUL DE INREGISTRARE: FAKEECC001

Americano
1.000 x 91.37
91.37

TOTAL
91.37
SUBTOTAL
91.37

TVA _ 0.00%
0.00

INTRODUS
0.00
CARD
91.37
REST
0.00

DATA 06.11.2028
ORA 14:22:33
BON FISCAL
Nr: 0066
NUMARUL FABRICARII
DEMO00001

0000650321
`;

const noSubtotalText = `
S.C. EXEMPLU TEST S.R.L.
COD FISCAL: 9876543210987
mun.Chisinau, bd.Dacia, 47/7
NUMARUL DE INREGISTRARE: FAKEECC003

35828-Portocale . 1/
1.168 x 23.00
26.86 A
35868-Mandarine 1/KG
0.860 x 29.00
24.94 A

TOTAL
51.80

TVA A 20.00%
8.63

CARD
51.80

DATA 12.03.2026
ORA 19:17:58
BON FISCAL
Nr: 0341
NUMARUL FABRICARII
70002454

0000374307
`;

describe('parseReceiptText', () => {
  it('extracts structured fields from a four-part URL receipt', () => {
    const receipt = parseReceiptText(sampleText, sourceUrl);

    expect(receipt.merchant.name).toBe('DEMO MARKET SRL');
    expect(receipt.merchant.taxId).toBe('1234567890123');
    expect(receipt.eccId).toBe('FAKEECC001');
    expect(receipt.urlReceiptNumber).toBe('650321');
    expect(receipt.urlTotal).toBe('91.37');
    expect(receipt.urlDate).toBe('2028-11-06');
    expect(receipt.printedNumber).toBe('0066');
    expect(receipt.deviceNumber).toBe('DEMO00001');
    expect(receipt.total).toBe('91.37');
    expect(receipt.items).toHaveLength(1);
    expect(receipt.items[0].name).toBe('Americano');
    expect(receipt.items[0].quantity).toBe(1);
    expect(receipt.items[0].unitPrice).toBe(91.37);
    expect(receipt.issuedAt).toBe('2028-11-06T14:22:33');
  });

  it('renders ASCII-only thermal output', () => {
    const receipt = parseReceiptText(sampleText, sourceUrl);

    expect(/^[\x00-\x7F]*$/.test(receipt.asciiReceipt)).toBe(true);
    expect(receipt.asciiReceipt).toContain('DEMO MARKET SRL');
    expect(receipt.asciiReceipt).toContain('NUMARUL DE INREGISTRARE: FAKEECC001');
    expect(receipt.asciiReceipt).toContain('ID BON');
    expect(receipt.asciiReceipt).toContain('SUBTOTAL');
    expect(receipt.asciiReceipt).toContain('BON FISCAL');
    expect(receipt.asciiReceipt).toContain('--------------------------------');
  });

  it('extracts the canonical tuple from opaque lookup receipts', () => {
    const receipt = parseReceiptText(noSubtotalText, opaqueSourceUrl);

    expect(receipt.eccId).toBe('FAKEECC003');
    expect(receipt.urlTotal).toBe('51.80');
    expect(receipt.urlReceiptNumber).toBe('374307');
    expect(receipt.urlDate).toBe('2026-03-12');
    expect(receipt.subtotal).toBeNull();
    expect(receipt.items).toHaveLength(2);
    expect(receipt.items[0].total).toBe(26.86);
    expect(receipt.payments.card).toBe(51.8);
  });
});
