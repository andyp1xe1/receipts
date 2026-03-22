export function formatMoney(value: number | string): string {
  const amount = typeof value === 'string' ? Number(value) : value;
  return amount.toFixed(2);
}

export function formatCurrency(value: number | string): string {
  return `${formatMoney(value)} MDL`;
}

export function formatMonthLabel(month: string): string {
  const [year, rawMonth] = month.split('-');
  const date = new Date(Number(year), Number(rawMonth) - 1, 1);
  return new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(date);
}

export function formatDateTime(value: string | null): string {
  if (!value) return 'Unknown time';
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

export function slugCategory(value: string | null): string {
  return value && value.trim() ? value : 'Unsorted';
}
