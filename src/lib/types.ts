export type MoneyLike = string;

export interface Merchant {
  name: string;
  taxId: string;
  address: string;
}

export interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface TaxLine {
  label: string;
  ratePercent: number | null;
  amount: number;
}

export interface Payments {
  cashGiven: number | null;
  card: number | null;
  change: number | null;
  other: Record<string, number>;
}

export interface ParsedReceipt {
  sourceUrl: string;
  merchant: Merchant;
  eccId: string;
  urlTotal: MoneyLike;
  urlReceiptNumber: string;
  urlDate: string;
  issuedAt: string | null;
  printedNumber: string | null;
  deviceNumber: string | null;
  items: ReceiptItem[];
  subtotal: MoneyLike | null;
  total: MoneyLike;
  taxes: TaxLine[];
  payments: Payments;
  rawLines: string[];
  asciiReceipt: string;
}

export interface ReceiptRecord {
  id: string;
  userId: string | null;
  sourceUrl: string;
  eccId: string;
  urlTotal: string;
  urlReceiptNumber: string;
  urlDate: string;
  merchantName: string;
  merchantTaxId: string | null;
  issuedAt: string | null;
  total: string;
  category: string | null;
  note: string | null;
  rawJson: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReceiptSummary extends ReceiptRecord {
  parsed: ParsedReceipt;
}

export interface EnhancedStats {
  period: 'weekly' | 'monthly' | 'yearly';
  periodTotals: Array<{ period: string; total: number; count: number }>;
  categoryByPeriod: Array<{ period: string; category: string; total: number; count: number }>;
}
