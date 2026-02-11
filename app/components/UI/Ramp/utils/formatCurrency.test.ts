import { formatCurrency, formatTokenAmount } from './formatCurrency';

describe('formatTokenAmount', () => {
  it('formats token amount with symbol and max 6 decimals', () => {
    expect(formatTokenAmount(0.05, 'ETH')).toMatch(/^[\d,.]+\s+ETH$/);
    expect(formatTokenAmount('1.123456789', 'USDC')).toMatch(
      /^[\d,.]+\s+USDC$/,
    );
  });

  it('accepts custom maxDecimals', () => {
    const result = formatTokenAmount(1.123456789, 'ETH', {
      maxDecimals: 2,
    });
    expect(result).toMatch(/^[\d,.]+\s+ETH$/);
  });
});

describe('formatCurrency', () => {
  it('formats currency amounts correctly', () => {
    expect(formatCurrency(100, 'USD')).toBe('$100.00');
    expect(formatCurrency('50.5', 'EUR')).toBe('€50.50');
    expect(formatCurrency(0, 'USD')).toBe('$0.00');
  });

  it('applies custom options', () => {
    const result = formatCurrency(100, 'USD', {
      currencyDisplay: 'narrowSymbol',
    });
    expect(result).toBe('$100.00');
  });

  it('defaults to USD when no currency provided', () => {
    expect(formatCurrency(100, '')).toBe('$100.00');
  });
});
