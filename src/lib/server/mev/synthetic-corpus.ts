export type SyntheticReceiptFixture = {
  id: string;
  kind: 'four_part' | 'opaque_lookup';
  sourceUrl: string;
  body: string;
  expected: {
    merchantName: string;
    taxId: string;
    eccId: string;
    urlTotal: string;
    urlReceiptNumber: string;
    urlDate: string;
    issuedAt: string;
      printedNumber: string;
      deviceNumber: string;
      total: string;
      subtotal: string | null;
      items: Array<{
        name: string;
        quantity: number;
        unitPrice: number;
        total: number;
      }>;
      payments: {
        cashGiven: number | null;
        card: number | null;
        change: number | null;
    };
    taxLabels: string[];
  };
};

const separator = '````````````````````````````````````````````````';

export const syntheticReceiptCorpus: SyntheticReceiptFixture[] = [
  {
    id: 'kiosk-cash-zero-tax',
    kind: 'four_part',
    sourceUrl: 'https://mev.sfs.md/receipt-verifier/SYNTHKIOSK01/18.50/4105/2026-04-19',
    body: `
NOVA BREW SRL
COD FISCAL: 1010101010101
mun. Chisinau, str. Arborilor 12/3
NUMARUL DE INREGISTRARE: SYNTHKIOSK01
${separator}
Espresso lung
1.000 x 18.50
18.50 _
${separator}
TOTAL
18.50
SUBTOTAL
18.50
${separator}
TVA _ 0.00%
0.00
${separator}
INTRODUS
20.00
CARD
0.00
REST
1.50
${separator}
DATA 19.04.2026
ORA 15:31:00
BON FISCAL
Nr: 0066
NUMARUL FABRICARII
KIOSK00012

0000004105
`,
    expected: {
      merchantName: 'NOVA BREW SRL',
      taxId: '1010101010101',
      eccId: 'SYNTHKIOSK01',
      urlTotal: '18.50',
      urlReceiptNumber: '4105',
      urlDate: '2026-04-19',
      issuedAt: '2026-04-19T15:31:00',
      printedNumber: '0066',
      deviceNumber: 'KIOSK00012',
      total: '18.50',
      subtotal: '18.50',
      items: [{ name: 'Espresso lung', quantity: 1, unitPrice: 18.5, total: 18.5 }],
      payments: {
        cashGiven: 20,
        card: 0,
        change: 1.5
      },
      taxLabels: ['TVA _ 0.00%']
    }
  },
  {
    id: 'terminal-snack-eight-percent',
    kind: 'four_part',
    sourceUrl: 'https://sift-mev.sfs.md/receipt/SYNTHFOOD08/45.00/102374/2026-04-21',
    body: `
TERMINAL BISTRO S.R.L.
COD FISCAL: 1014600099999
Municipiul Chisinau, Sectorul Botanica, bd. Aeroport 4/2
NUMARUL DE INREGISTRARE: SYNTHFOOD08
${separator}
Placinta rustica 1/150
1.000 x 25.00
25.00 B
Cafea neagra
1.000 x 20.00
20.00 B
${separator}
TOTAL
45.00
${separator}
TVA B 8.00%
3.33
${separator}
CARD
45.00
${separator}
DATA 21.04.2026
ORA 17:17:23
BON FISCAL
Nr: 0142
NUMARUL FABRICARII
TERM0042191

0000102374
`,
    expected: {
      merchantName: 'TERMINAL BISTRO S.R.L.',
      taxId: '1014600099999',
      eccId: 'SYNTHFOOD08',
      urlTotal: '45.00',
      urlReceiptNumber: '102374',
      urlDate: '2026-04-21',
      issuedAt: '2026-04-21T17:17:23',
      printedNumber: '0142',
      deviceNumber: 'TERM0042191',
      total: '45.00',
      subtotal: null,
      items: [
        { name: 'Placinta rustica 1/150', quantity: 1, unitPrice: 25, total: 25 },
        { name: 'Cafea neagra', quantity: 1, unitPrice: 20, total: 20 }
      ],
      payments: {
        cashGiven: null,
        card: 45,
        change: null
      },
      taxLabels: ['TVA B 8.00%']
    }
  },
  {
    id: 'market-produce-mixed-tax',
    kind: 'opaque_lookup',
    sourceUrl: 'https://sift-mev.sfs.md/receipt/SYNTH-OPAQUE-ALPHA',
    body: `
S.C. PIATA URBANA S.R.L.
COD FISCAL: 1004600088887
mun. Chisinau, bd. Dacia, 47/7
NUMARUL DE INREGISTRARE: SYNTHMARK134
${separator}
35828-Caise vrac 1/
1.168 x 23.00
26.86 A
35868-Clementine 1/KG
0.860 x 29.00
24.94 A
115789-File de curcan
0.456 x 199.00
90.74 A
180289-Piept de curcan
1.000 x 131.55
131.55 A
194027-Miez de floare
2.000 x 14.00
28.00 B
112343-Ardei dulce K
0.214 x 91.20
19.52 B
247059-Turta rustica
2.000 x 27.00
54.00 B
357002-Ridiche rosie
0.600 x 72.00
43.20 B
${separator}
TOTAL
418.81
${separator}
TVA A 20.00%
45.68
TVA B 8.00%
10.72
${separator}
CARD
418.81
${separator}
DATA 12.04.2026
ORA 19:17:58
BON FISCAL
Nr: 0341
NUMARUL FABRICARII
MARKET9991

0000403205
`,
    expected: {
      merchantName: 'S.C. PIATA URBANA S.R.L.',
      taxId: '1004600088887',
      eccId: 'SYNTHMARK134',
      urlTotal: '418.81',
      urlReceiptNumber: '403205',
      urlDate: '2026-04-12',
      issuedAt: '2026-04-12T19:17:58',
      printedNumber: '0341',
      deviceNumber: 'MARKET9991',
      total: '418.81',
      subtotal: null,
      items: [
        { name: '35828-Caise vrac 1/', quantity: 1.168, unitPrice: 23, total: 26.86 },
        { name: '35868-Clementine 1/KG', quantity: 0.86, unitPrice: 29, total: 24.94 },
        { name: '115789-File de curcan', quantity: 0.456, unitPrice: 199, total: 90.74 },
        { name: '180289-Piept de curcan', quantity: 1, unitPrice: 131.55, total: 131.55 },
        { name: '194027-Miez de floare', quantity: 2, unitPrice: 14, total: 28 },
        { name: '112343-Ardei dulce K', quantity: 0.214, unitPrice: 91.2, total: 19.52 },
        { name: '247059-Turta rustica', quantity: 2, unitPrice: 27, total: 54 },
        { name: '357002-Ridiche rosie', quantity: 0.6, unitPrice: 72, total: 43.2 }
      ],
      payments: {
        cashGiven: null,
        card: 418.81,
        change: null
      },
      taxLabels: ['TVA A 20.00%', 'TVA B 8.00%']
    }
  },
  {
    id: 'quick-service-mixed-tax',
    kind: 'four_part',
    sourceUrl: 'https://sift-mev.sfs.md/receipt/SYNTHSNACK27/48.00/79074/2026-04-15',
    body: `
CITY DELI F.P.C. S.R.L.
COD FISCAL: 1003600099907
mun. Chisinau, sec. Centru, str. Miorita 11
NUMARUL DE INREGISTRARE: SYNTHSNACK27
${separator}
French hot dog
1.000 x 25.00
25.00 B
Cafea Americano to go
1.000 x 23.00
23.00 A
${separator}
TOTAL
48.00
${separator}
TVA A 20.00%
3.83
TVA B 8.00%
1.85
${separator}
CARD
48.00
${separator}
DATA 15.04.2026
ORA 08:38:17
BON FISCAL
Nr: 0005
NUMARUL FABRICARII
SNACK06054

0000079074
`,
    expected: {
      merchantName: 'CITY DELI F.P.C. S.R.L.',
      taxId: '1003600099907',
      eccId: 'SYNTHSNACK27',
      urlTotal: '48.00',
      urlReceiptNumber: '79074',
      urlDate: '2026-04-15',
      issuedAt: '2026-04-15T08:38:17',
      printedNumber: '0005',
      deviceNumber: 'SNACK06054',
      total: '48.00',
      subtotal: null,
      items: [
        { name: 'French hot dog', quantity: 1, unitPrice: 25, total: 25 },
        { name: 'Cafea Americano to go', quantity: 1, unitPrice: 23, total: 23 }
      ],
      payments: {
        cashGiven: null,
        card: 48,
        change: null
      },
      taxLabels: ['TVA A 20.00%', 'TVA B 8.00%']
    }
  },
  {
    id: 'apparel-large-basket',
    kind: 'opaque_lookup',
    sourceUrl: 'https://sift-mev.sfs.md/receipt/SYNTH-OPAQUE-BETA',
    body: `
URBAN THREADS S.R.L.
COD FISCAL: 1011600088810
mun. Chisinau, bd. Decebal, 139
NUMARUL DE INREGISTRARE: SYNTHSTYLE289
${separator}
1000810677835 /TRN BLUZA BARBAT OPTICAL M
1.000 x 279.00
279.00 A
1000810676692 /TRN BLUZA BARBAT SAND M
1.000 x 279.00
279.00 A
1000807587079 /TRN BLUZA FEMEIE BEJ M
1.000 x 379.00
379.00 A
1000810691664 /TRN TRICOU FEMEIE NEGRU M
1.000 x 179.00
179.00 A
1000799858232 /TRN TRICOU FEMEIE OPTICAL M
1.000 x 179.00
179.00 A
1000755739124 /TRN PANTALONI FEMEIE ALBA 46
1.000 x 199.00
199.00 A
1000807846848 /TRN PANTALONI FEMEIE LIGHT GRI M
1.000 x 399.00
399.00 A
1000820012345 /TRN JACHETA FEMEIE NAVY M
1.000 x 299.00
299.00 A
1000820012346 /TRN BLUZA FEMEIE IVORY S
1.000 x 279.00
279.00 A
${separator}
TOTAL
2471.00
${separator}
TVA A 20.00%
411.83
${separator}
CARD
2471.00
${separator}
DATA 28.04.2026
ORA 14:25:26
BON FISCAL
Nr: 0060
NUMARUL FABRICARII
STYLE3560

0000093932
`,
    expected: {
      merchantName: 'URBAN THREADS S.R.L.',
      taxId: '1011600088810',
      eccId: 'SYNTHSTYLE289',
      urlTotal: '2471.00',
      urlReceiptNumber: '93932',
      urlDate: '2026-04-28',
      issuedAt: '2026-04-28T14:25:26',
      printedNumber: '0060',
      deviceNumber: 'STYLE3560',
      total: '2471.00',
      subtotal: null,
      items: [
        { name: '1000810677835 /TRN BLUZA BARBAT OPTICAL M', quantity: 1, unitPrice: 279, total: 279 },
        { name: '1000810676692 /TRN BLUZA BARBAT SAND M', quantity: 1, unitPrice: 279, total: 279 },
        { name: '1000807587079 /TRN BLUZA FEMEIE BEJ M', quantity: 1, unitPrice: 379, total: 379 },
        { name: '1000810691664 /TRN TRICOU FEMEIE NEGRU M', quantity: 1, unitPrice: 179, total: 179 },
        { name: '1000799858232 /TRN TRICOU FEMEIE OPTICAL M', quantity: 1, unitPrice: 179, total: 179 },
        { name: '1000755739124 /TRN PANTALONI FEMEIE ALBA 46', quantity: 1, unitPrice: 199, total: 199 },
        { name: '1000807846848 /TRN PANTALONI FEMEIE LIGHT GRI M', quantity: 1, unitPrice: 399, total: 399 },
        { name: '1000820012345 /TRN JACHETA FEMEIE NAVY M', quantity: 1, unitPrice: 299, total: 299 },
        { name: '1000820012346 /TRN BLUZA FEMEIE IVORY S', quantity: 1, unitPrice: 279, total: 279 }
      ],
      payments: {
        cashGiven: null,
        card: 2471,
        change: null
      },
      taxLabels: ['TVA A 20.00%']
    }
  }
];
