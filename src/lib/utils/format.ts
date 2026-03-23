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

export function formatWeekLabel(weekStr: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(weekStr)) {
    const monday = new Date(`${weekStr}T00:00:00Z`);
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);
    const short = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', timeZone: 'UTC' });
    const shortYear = new Intl.DateTimeFormat('en', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC'
    });

    if (monday.getUTCFullYear() === sunday.getUTCFullYear()) {
      return `${short.format(monday)}-${short.format(sunday)}, ${sunday.getUTCFullYear()}`;
    }

    return `${shortYear.format(monday)}-${shortYear.format(sunday)}`;
  }

  const match = weekStr.match(/^(\d{4})-W(\d{2})$/);
  if (!match) return weekStr;
  const year = Number(match[1]);
  const week = Number(match[2]);
  // ISO week: Jan 4 is always in week 1
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7; // Mon=1..Sun=7
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - dayOfWeek + 1 + (week - 1) * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' });
  const yearSuffix = `, ${year}`;
  return `${fmt.format(monday)}-${fmt.format(sunday)}${yearSuffix}`;
}

export function formatPeriodLabel(period: 'weekly' | 'monthly' | 'yearly', value: string): string {
  if (period === 'weekly') return formatWeekLabel(value);
  if (period === 'monthly') return formatMonthLabel(value);
  return value; // yearly is just the year
}
