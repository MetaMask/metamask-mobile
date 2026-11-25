import { musdMinimumAmount } from './earningsSummarySection';

describe('musdMinimumAmount', () => {
  it('formats a whole-dollar minimum with no fraction digits', () => {
    expect(musdMinimumAmount('1000000')).toBe('$1');
  });

  it('returns undefined when the minimum is missing', () => {
    expect(musdMinimumAmount(undefined)).toBeUndefined();
    expect(musdMinimumAmount(null)).toBeUndefined();
    expect(musdMinimumAmount('')).toBeUndefined();
  });

  it('returns undefined when the minimum is unreadable', () => {
    expect(musdMinimumAmount('not-a-number')).toBeUndefined();
  });
});
