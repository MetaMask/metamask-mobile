import { DAY, HOUR, MINUTE } from '../../../../constants/time';
import {
  formatHoldDuration,
  holdDurationFromTimestamps,
} from './formatHoldDuration';

describe('formatHoldDuration', () => {
  it('formats multi-day holds with leftover hours', () => {
    expect(formatHoldDuration(2 * DAY + 2 * HOUR)).toBe('2d 2h');
  });

  it('formats hour-only holds', () => {
    expect(formatHoldDuration(8 * HOUR)).toBe('8h');
  });

  it('formats sub-hour holds in minutes', () => {
    expect(formatHoldDuration(12 * MINUTE)).toBe('12m');
  });
});

describe('holdDurationFromTimestamps', () => {
  it('uses the span between two unix-second timestamps', () => {
    const start = 1_700_000_000;
    const end = start + (21 * HOUR + 53 * MINUTE) / 1000;

    expect(holdDurationFromTimestamps(start, end)).toBe('21h 53m');
  });
});
