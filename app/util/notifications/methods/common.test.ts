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

    expect(formatRelative(yesterday, today)).toBe('a day ago');
    expect(formatRelative(tomorrow, today)).toBe('in a day');
    expect(formatRelative(subMonths(today, 1), today)).toBe('a month ago');
    expect(formatRelative(addMonths(today, 1), today)).toBe('in a month');
    expect(formatRelative(subYears(today, 1), today)).toBe('a year ago');
    expect(formatRelative(addYears(today, 1), today)).toBe('in a year');
  });
});
