import { formatCurrency } from './formatCurrency';

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
