import { formatLimitOrderAmount } from './formatLimitOrderAmount';

describe('formatLimitOrderAmount', () => {
  it('converts a minimal-unit amount into a human-readable string', () => {
    expect(formatLimitOrderAmount('100000000000000000', 18)).toBe('0.1');
  });

  it('formats a 6-decimal token amount', () => {
    expect(formatLimitOrderAmount('220000000', 6)).toBe('220');
  });

  it('returns "0" for a zero amount', () => {
    expect(formatLimitOrderAmount('0', 18)).toBe('0');
  });
});
