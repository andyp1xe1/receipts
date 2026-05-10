import type { ParsedReceipt, Payments, ReceiptItem, TaxLine } from '$lib/types';
import { formatMoney } from '$lib/utils/format';

const moneySuffixPattern = /^(?<amount>\d+(?:[.,]\d{1,2})?)(?:\s+[A-Z_]+)?$/;
const qtyPricePattern = /^(?<qty>\d+(?:[.,]\d+)?)\s*x\s*(?<unit>\d+(?:[.,]\d{1,2})?)$/i;
const datePattern = /DATA\s+(?<date>\d{2}\.\d{2}\.\d{4})/i;
const timePattern = /ORA\s+(?<time>\d{2}:\d{2}:\d{2})/i;
const numberPattern = /(\d+)$/;
const fullNumberPattern = /^\d+$/;
const fourPartUrlPattern = /https:\/\/[^/]+\/(?:receipt|receipt-verifier)\/(?<ecc>[^/]+)\/(?<total>[^/]+)\/(?<receipt>[^/]+)\/(?<date>\d{4}-\d{2}-\d{2})\/?$/;
const stripHtmlBlocksPattern = /<(script|style|noscript)[^>]*>[\s\S]*?<\/\1>/gi;
const stripHtmlOpenLineBreakPattern = /<(br|div|p|section|article|li|tr|td|th|h1|h2|h3|h4|h5|h6)[^>]*>/gi;
const stripHtmlCloseLineBreakPattern = /<\/(div|p|section|article|li|tr|td|th|h1|h2|h3|h4|h5|h6)>/gi;
const stripHtmlTagPattern = /<[^>]+>/g;
const paymentLabels = ['INTRODUS', 'CARD', 'REST'] as const;

const browserLikeHeaders = {
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'accept-language': 'en-US,en;q=0.9,ro;q=0.8',
  'cache-control': 'no-cache',
  pragma: 'no-cache'
} as const;

function asciiNormalize(value: string): string {
  return value
    .replaceAll('№', 'Nr')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x00-\x7F]/g, '');
}

function decodeHtml(value: string): string {
  return value
    .replaceAll('&nbsp;', ' ')
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>');
}

function parseDecimal(value: string): number {
  return Number(value.replace(',', '.'));
}

function parseMoney(value: string): number {
  return Number(parseDecimal(value).toFixed(2));
}

function moneyValue(line: string | undefined): number | null {
  if (!line) return null;
  const match = line.trim().match(moneySuffixPattern);
  if (!match?.groups?.amount) return null;
  return parseMoney(match.groups.amount);
}

function isSeparator(line: string): boolean {
  const stripped = line.trim();
  return /^[-_`=.~*]{6,}$/.test(stripped);
}

function nextValue(lines: string[], index: number): string | null {
  for (const candidate of lines.slice(index + 1)) {
    if (candidate && !isSeparator(candidate)) return candidate;
  }
  return null;
}

function firstIndex(lines: string[], ...labels: string[]): number | null {
  for (const [index, line] of lines.entries()) {
    if (labels.includes(line)) return index;
  }
  return null;
}

function lastNumericLine(lines: string[]): string | null {
  for (const line of [...lines].reverse()) {
    if (fullNumberPattern.test(line)) return line;
  }
  return null;
}

function extractRatePercent(label: string): number | null {
  const match = label.match(/(\d+(?:[.,]\d+)?)%/);
  return match ? parseMoney(match[1]) : null;
}

function parseIssuedAt(lines: string[]): string | null {
  const dateLine = lines.find((line) => line.startsWith('DATA '));
  const timeLine = lines.find((line) => line.startsWith('ORA '));
  if (!dateLine || !timeLine) return null;

  const dateMatch = dateLine.match(datePattern);
  const timeMatch = timeLine.match(timePattern);
  if (!dateMatch?.groups?.date || !timeMatch?.groups?.time) return null;

  const [day, month, year] = dateMatch.groups.date.split('.');
  return `${year}-${month}-${day}T${timeMatch.groups.time}`;
}

function parseItems(lines: string[], eccIndex: number, totalIndex: number): ReceiptItem[] {
  const payload = lines.slice(eccIndex + 1, totalIndex).filter((line) => !isSeparator(line));
  const items: ReceiptItem[] = [];

  for (let index = 0; index < payload.length; ) {
    const description = payload[index];
    const qtyPrice = payload[index + 1]?.match(qtyPricePattern);
    if (!qtyPrice?.groups) {
      index += 1;
      continue;
    }

    const quantity = parseDecimal(qtyPrice.groups.qty);
    const unitPrice = parseMoney(qtyPrice.groups.unit);
    let total = Number((quantity * unitPrice).toFixed(2));
    let consumed = 2;

    const explicitTotal = moneyValue(payload[index + 2]);
    if (explicitTotal !== null) {
      total = explicitTotal;
      consumed = 3;
    }

    items.push({
      name: description,
      quantity,
      unitPrice,
      total
    });
    index += consumed;
  }

  return items;
}

function parseTaxes(lines: string[], startIndex: number, endIndex: number): TaxLine[] {
  const taxes: TaxLine[] = [];
  for (let index = startIndex; index < endIndex; index += 1) {
    const line = lines[index];
    if (isSeparator(line)) continue;
    if (!line.startsWith('TVA')) continue;

    taxes.push({
      label: line,
      ratePercent: extractRatePercent(line),
      amount: moneyValue(nextValue(lines, index) ?? undefined) ?? 0
    });
  }
  return taxes;
}

function parsePayments(lines: string[]): Payments {
  const payments: Payments = { cashGiven: null, card: null, change: null, other: {} };
  const dateIndex = lines.findIndex((line) => line.startsWith('DATA '));
  const paymentLines = lines.slice(0, dateIndex === -1 ? lines.length : dateIndex);

  for (const label of paymentLabels) {
    const labelIndex = paymentLines.indexOf(label);
    if (labelIndex === -1) continue;
    const amount = moneyValue(nextValue(paymentLines, labelIndex) ?? undefined) ?? 0;
    switch (label) {
      case 'INTRODUS':
        payments.cashGiven = amount;
        break;
      case 'CARD':
        payments.card = amount;
        break;
      case 'REST':
        payments.change = amount;
        break;
    }
  }

  const known = new Set<string>(paymentLabels);
  for (let index = 0; index < paymentLines.length; index += 1) {
    const line = paymentLines[index];
    if (known.has(line) || isSeparator(line)) continue;
    if (!/^[A-Z0-9 /()+.-]{3,}$/.test(line)) continue;
    const amount = moneyValue(paymentLines[index + 1]);
    if (amount === null) continue;
    if (line === 'TOTAL' || line === 'SUBTOTAL' || line === 'BON FISCAL' || line.startsWith('TVA')) {
      continue;
    }
    payments.other[line] = amount;
  }

  return payments;
}

function parseInputUrl(url: string): {
  ecc: string | null;
  total: number | null;
  receipt: string | null;
  date: string | null;
} {
  const match = url.match(fourPartUrlPattern);
  if (!match?.groups) {
    return { ecc: null, total: null, receipt: null, date: null };
  }
  return {
    ecc: match.groups.ecc,
    total: parseMoney(match.groups.total),
    receipt: match.groups.receipt,
    date: match.groups.date
  };
}

function canonicalTupleFromLines(lines: string[]) {
  const eccLine = lines.find((line) => line.startsWith('NUMARUL DE INREGISTRARE:'));
  const totalIndex = firstIndex(lines, 'TOTAL');
  const issuedAt = parseIssuedAt(lines);
  const numericTail = lastNumericLine(lines);

  if (!eccLine || totalIndex === null) throw new Error('Receipt identity could not be extracted');

  const total = moneyValue(nextValue(lines, totalIndex) ?? undefined);
  if (total === null || !issuedAt || !numericTail) {
    throw new Error('Receipt identity could not be extracted');
  }

  return {
    eccId: eccLine.split(':', 2)[1].trim(),
    total,
    receiptNumber: String(Number(numericTail)),
    date: issuedAt.slice(0, 10)
  };
}

function stripHtmlToText(html: string): string {
  return decodeHtml(
    html
      .replace(stripHtmlBlocksPattern, ' ')
      .replace(stripHtmlOpenLineBreakPattern, '\n')
      .replace(stripHtmlCloseLineBreakPattern, '\n')
      .replace(stripHtmlTagPattern, ' ')
  );
}

export function htmlToLines(textOrHtml: string): string[] {
  const text = textOrHtml.includes('<') && textOrHtml.includes('>') ? stripHtmlToText(textOrHtml) : textOrHtml;
  return text
    .split(/\r?\n/)
    .map((line) => asciiNormalize(line.split(/\s+/).filter(Boolean).join(' ')))
    .filter(Boolean);
}

function wrapAscii(text: string, width: number): string[] {
  const asciiText = asciiNormalize(text);
  if (asciiText.length <= width) return [asciiText];

  const words = asciiText.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= width) {
      current = candidate;
      continue;
    }

    if (current) lines.push(current);
    if (word.length <= width) {
      current = word;
      continue;
    }

    for (let index = 0; index < word.length; index += width) {
      lines.push(word.slice(index, index + width));
    }
    current = '';
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

function justify(left: string, right: string, width: number): string[] {
  const leftValue = asciiNormalize(left);
  const rightValue = asciiNormalize(right);
  if (leftValue.length + rightValue.length + 1 <= width) {
    return [`${leftValue}${' '.repeat(width - leftValue.length - rightValue.length)}${rightValue}`];
  }

  const wrappedLeft = wrapAscii(leftValue, width - rightValue.length - 1);
  const lines = [
    `${wrappedLeft[0]}${' '.repeat(width - wrappedLeft[0].length - rightValue.length)}${rightValue}`
  ];
  for (const continuation of wrappedLeft.slice(1)) lines.push(continuation);
  return lines;
}

export function renderAsciiReceipt(receipt: Omit<ParsedReceipt, 'asciiReceipt'>, width = 48): string {
  const output: string[] = [];
  const separator = '-'.repeat(width);

  const addCenter = (text: string) => {
    for (const line of wrapAscii(text, width)) {
      output.push(line.padStart(Math.floor((width + line.length) / 2), ' ').padEnd(width, ' '));
    }
  };
  const addLine = (text = '') => output.push(asciiNormalize(text));
  const addPair = (left: string, right: string) => output.push(...justify(left, right, width));

  addCenter(receipt.merchant.name);
  addCenter(`COD FISCAL: ${receipt.merchant.taxId}`);
  for (const line of wrapAscii(receipt.merchant.address, width)) addCenter(line);
  addCenter(`NUMARUL DE INREGISTRARE: ${receipt.eccId}`);
  addLine(separator);

  for (const item of receipt.items) {
    for (const line of wrapAscii(item.name, width)) addLine(line);
    addPair(`${item.quantity.toFixed(3)} x ${formatMoney(item.unitPrice)}`, formatMoney(item.total));
  }
  addLine(separator);

  if (receipt.subtotal) addPair('SUBTOTAL', receipt.subtotal);
  addPair('TOTAL', receipt.total);
  for (const tax of receipt.taxes) {
    addPair(tax.label.replaceAll('_', ' ').replace(/\s+/g, ' ').trim(), formatMoney(tax.amount));
  }
  addLine(separator);

  if (receipt.payments.cashGiven !== null) addPair('INTRODUS', formatMoney(receipt.payments.cashGiven));
  if (receipt.payments.card !== null) addPair('CARD', formatMoney(receipt.payments.card));
  if (receipt.payments.change !== null) addPair('REST', formatMoney(receipt.payments.change));
  for (const [label, amount] of Object.entries(receipt.payments.other).sort(([a], [b]) => a.localeCompare(b))) {
    if (!['INTRODUS', 'CARD', 'REST'].includes(label)) addPair(label, formatMoney(amount));
  }
  addLine(separator);

  if (receipt.issuedAt) {
    const [datePart, timePart] = receipt.issuedAt.split('T');
    const [year, month, day] = datePart.split('-');
    addPair(`DATA ${day}.${month}.${year}`, `ORA ${timePart}`);
  }
  if (receipt.printedNumber) addPair('BON FISCAL', `Nr ${receipt.printedNumber}`);
  if (receipt.deviceNumber) addPair('NUMARUL FABRICARII', receipt.deviceNumber);
  addPair('ID BON', receipt.urlReceiptNumber.padStart(10, '0'));

  return `${output.join('\n').replace(/[ \t]+$/gm, '').trimEnd()}\n`;
}

export function parseReceiptText(textOrHtml: string, sourceUrl: string): ParsedReceipt {
  const lines = htmlToLines(textOrHtml);
  if (!lines.join('\n').includes('COD FISCAL:')) {
    throw new Error('No receipt details found in the provided content');
  }

  const taxIndex = lines.findIndex((line) => line.startsWith('COD FISCAL:'));
  const eccIndex = lines.findIndex((line) => line.startsWith('NUMARUL DE INREGISTRARE:'));
  const totalIndex = firstIndex(lines, 'TOTAL');
  if (taxIndex < 1 || eccIndex === -1 || totalIndex === null) {
    throw new Error('Receipt structure is incomplete');
  }

  const subtotalIndex = firstIndex(lines, 'SUBTOTAL');
  const taxStart = subtotalIndex === null ? totalIndex + 1 : subtotalIndex + 1;
  const sectionMarkers = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => ['INTRODUS', 'CARD', 'REST'].includes(line) || line.startsWith('DATA '))
    .map(({ index }) => index);
  const sectionEnd = sectionMarkers.length ? Math.min(...sectionMarkers) : lines.length;

  const fromUrl = parseInputUrl(sourceUrl);
  const canonical = canonicalTupleFromLines(lines);
  const issuedAt = parseIssuedAt(lines);

  let printedNumber: string | null = null;
  const bonIndex = lines.indexOf('BON FISCAL');
  if (bonIndex !== -1) {
    const printedLine = nextValue(lines, bonIndex);
    if (printedLine) {
      printedNumber = printedLine.replace('Nr:', '').replace('Nr', '').replace(':', '').trim();
    }
  }

  let deviceNumber: string | null = null;
  let receiptTailIndex = totalIndex;
  const deviceIndex = lines.indexOf('NUMARUL FABRICARII');
  if (deviceIndex !== -1) {
    deviceNumber = nextValue(lines, deviceIndex);
    receiptTailIndex = Math.max(receiptTailIndex, deviceIndex + 1);
  }

  for (let index = lines.length - 1; index >= 0; index -= 1) {
    if (fullNumberPattern.test(lines[index]) && lines[index].length >= 4) {
      receiptTailIndex = Math.max(receiptTailIndex, index);
      break;
    }
  }

  const receiptWithoutAscii: Omit<ParsedReceipt, 'asciiReceipt'> = {
    sourceUrl,
    merchant: {
      name: lines[taxIndex - 1].trim(),
      taxId: lines[taxIndex].split(':', 2)[1].trim(),
      address: lines[taxIndex + 1]?.trim() ?? ''
    },
    eccId: canonical.eccId,
    urlTotal: formatMoney(fromUrl.total ?? canonical.total),
    urlReceiptNumber: fromUrl.receipt ?? canonical.receiptNumber,
    urlDate: fromUrl.date ?? canonical.date,
    issuedAt,
    printedNumber,
    deviceNumber,
    items: parseItems(lines, eccIndex, totalIndex),
    subtotal:
      subtotalIndex === null
        ? null
        : moneyValue(nextValue(lines, subtotalIndex) ?? undefined) !== null
          ? formatMoney(moneyValue(nextValue(lines, subtotalIndex) ?? undefined) ?? 0)
          : null,
    total: formatMoney(moneyValue(nextValue(lines, totalIndex) ?? undefined) ?? canonical.total),
    taxes: parseTaxes(lines, taxStart, sectionEnd),
    payments: parsePayments(lines),
    rawLines: lines.slice(taxIndex - 1, receiptTailIndex + 1)
  };

  return {
    ...receiptWithoutAscii,
    asciiReceipt: renderAsciiReceipt(receiptWithoutAscii)
  };
}

export async function fetchReceiptHtml(url: string, init?: RequestInit): Promise<string> {
  let lastStatus: number | null = null;

  for (const candidateUrl of receiptFetchCandidates(url)) {
    const headers = new Headers(init?.headers);
    for (const [key, value] of Object.entries(browserLikeHeaders)) {
      headers.set(key, value);
    }
    headers.set('referer', new URL(candidateUrl).origin + '/');

    const response = await fetch(candidateUrl, {
      ...init,
      method: 'GET',
      redirect: 'follow',
      headers
    });

    if (response.ok) {
      return response.text();
    }

    lastStatus = response.status;
    if (![401, 403, 404].includes(response.status)) {
      break;
    }
  }

  throw new Error(`Receipt fetch failed with ${lastStatus ?? 'unknown status'}`);
}

function receiptFetchCandidates(sourceUrl: string): string[] {
  const candidates = new Set([sourceUrl]);

  try {
    const url = new URL(sourceUrl);
    const segments = url.pathname.split('/').filter(Boolean);
    if (url.hostname === 'sift-mev.sfs.md' && segments[0] === 'receipt' && segments.length >= 2) {
      candidates.add(`https://mev.sfs.md/receipt-verifier/${segments.slice(1).join('/')}`);
    }

    if (url.hostname === 'mev.sfs.md' && segments[0] === 'receipt-verifier' && segments.length >= 2) {
      candidates.add(`https://sift-mev.sfs.md/receipt/${segments.slice(1).join('/')}`);
    }
  } catch {
    return [...candidates];
  }

  return [...candidates];
}

export async function fetchAndParseReceipt(sourceUrl: string): Promise<ParsedReceipt> {
  return parseReceiptText(await fetchReceiptHtml(sourceUrl), sourceUrl);
}

export function extractReceiptNumber(line: string): string | null {
  return line.match(numberPattern)?.[1] ?? null;
}
