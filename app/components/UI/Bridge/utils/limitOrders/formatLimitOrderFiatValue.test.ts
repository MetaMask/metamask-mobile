import { formatLimitOrderFiatValue } from './formatLimitOrderFiatValue';

describe('formatLimitOrderFiatValue', () => {
  it('formats a value with exactly two decimal places', () => {
    expect(formatLimitOrderFiatValue(2200.5, 'usd')).toBe('$2,200.50');
  });

  it('rounds a value with more than two decimal places', () => {
    expect(formatLimitOrderFiatValue('2200.456789', 'usd')).toBe('$2,200.46');
  });

  it('formats zero', () => {
    expect(formatLimitOrderFiatValue(0, 'usd')).toBe('$0.00');
  });

  it('shows a positive value below one cent as less than one cent', () => {
    expect(formatLimitOrderFiatValue(0.004, 'usd')).toBe('<$0.01');
  });

  it('keeps two decimal places for currencies that use fewer by default', () => {
    expect(formatLimitOrderFiatValue(1500, 'jpy')).toBe('¥1,500.00');
  });
});
