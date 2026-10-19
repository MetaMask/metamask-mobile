import { formatLimitOrderDate } from './formatLimitOrderDate';

describe('formatLimitOrderDate', () => {
  it('formats an ISO timestamp as a short date', () => {
    expect(formatLimitOrderDate('2026-03-12T13:00:00.000Z')).toBe('Mar 12');
  });

  it('returns a placeholder when the timestamp is undefined', () => {
    expect(formatLimitOrderDate(undefined)).toBe('--');
  });

  it('returns a placeholder when the timestamp is unparsable', () => {
    expect(formatLimitOrderDate('not-a-date')).toBe('--');
  });
});
