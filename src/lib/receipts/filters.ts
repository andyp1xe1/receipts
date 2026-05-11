import type { ReceiptRecord } from '$lib/types';
import { slugCategory } from '$lib/utils/format';
import type { ExportFilters } from './export';

export function matchesFilters(record: ReceiptRecord, filters: ExportFilters): boolean {
  if (filters.month && record.urlDate.slice(0, 7) !== filters.month) return false;
  if (filters.from && record.urlDate < filters.from) return false;
  if (filters.to && record.urlDate > filters.to) return false;
  if (filters.category) {
    if (filters.category === '__unsorted__') {
      if (slugCategory(record.category) !== 'Unsorted') return false;
    } else if (record.category !== filters.category) {
      return false;
    }
  }
  return true;
}

export function distinctCategories(records: ReceiptRecord[]): string[] {
  const seen = new Set<string>();
  for (const record of records) seen.add(slugCategory(record.category));
  return [...seen].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}
