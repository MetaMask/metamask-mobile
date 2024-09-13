import {
  addDays,
  addMonths,
  addYears,
  subDays,
  subMonths,
  subYears,
} from 'date-fns';
import { formatRelative } from './common';

describe('formatRelative', () => {
  it('should return the correct relative time based on the difference', () => {
    const today = new Date();
    const yesterday = subDays(today, 1);
    const tomorrow = addDays(today, 1);

    expect(formatRelative(yesterday, today)).toBe('yesterday');
    expect(formatRelative(tomorrow, today)).toBe('tomorrow');
    expect(formatRelative(subMonths(today, 1), today)).toBe('last month');
    expect(formatRelative(addMonths(today, 1), today)).toBe('next month');
    expect(formatRelative(subYears(today, 1), today)).toBe('last year');
    expect(formatRelative(addYears(today, 1), today)).toBe('next year');
  });
});
