import { convertUsdToFiat, formatFiat } from './fiat';

describe('convertUsdToFiat', () => {
  it('keeps the amount when the selected currency is USD', () => {
    const result = convertUsdToFiat(12.5, 'usd', 1);

    expect(result).toEqual({
      amount: 12.5,
      currency: 'usd',
      fellBackToUsd: false,
    });
  });

  it('multiplies by the EUR rate once', () => {
    const result = convertUsdToFiat(100, 'eur', 0.91);

    expect(result.amount).toBeCloseTo(91, 6);
    expect(result.currency).toBe('eur');
    expect(result.fellBackToUsd).toBe(false);
  });

  it('falls back to USD when the EUR rate is missing', () => {
    const result = convertUsdToFiat(100, 'eur', null);

    expect(result).toEqual({
      amount: 100,
      currency: 'usd',
      fellBackToUsd: true,
    });
  });

  it('falls back to USD when the rate is zero', () => {
    const result = convertUsdToFiat(100, 'eur', 0);

    expect(result.fellBackToUsd).toBe(true);
    expect(result.currency).toBe('usd');
  });
});

describe('formatFiat', () => {
  it('formats a positive USD amount with a sign', () => {
    const result = formatFiat(12.5, 'usd');

    expect(result).toBe('+$12.50');
  });

  it('formats a negative USD amount with a minus sign', () => {
    const result = formatFiat(-12.5, 'usd');

    expect(result).toBe('-$12.50');
  });

  it('formats zero without a sign', () => {
    const result = formatFiat(0, 'usd');

    expect(result).toBe('$0.00');
  });

  it('formats JPY with no fractional digits', () => {
    const result = formatFiat(1234.56, 'jpy');

    expect(result).toBe('+¥1,235');
  });
});
