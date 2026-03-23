import { describe, expect, it } from 'vitest';
import { formatWeekLabel } from './format';

describe('formatWeekLabel', () => {
  it('formats monday-based week keys from the database', () => {
    expect(formatWeekLabel('2021-01-04')).toBe('Jan 4-Jan 10, 2021');
  });

  it('keeps year boundaries accurate for cross-year weeks', () => {
    expect(formatWeekLabel('2020-12-28')).toBe('Dec 28, 2020-Jan 3, 2021');
  });
});
