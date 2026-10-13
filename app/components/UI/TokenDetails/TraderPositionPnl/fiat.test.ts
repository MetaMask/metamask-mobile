import { convertUsdToFiat, formatFiat } from './fiat';

describe('convertUsdToFiat', () => {
  it('keeps USD when the rate is missing', () => {
    const result = convertUsdToFiat(100, {
      currency: 'EUR',
      rate: undefined,
    });

    expect(result).toEqual({ value: 100, currency: 'USD' });
  });

  it('keeps USD when the rate is zero', () => {
    const result = convertUsdToFiat(100, 0, 'EUR');

    expect(result).toEqual({ value: 100, currency: 'USD' });
  });

  it('returns the unchanged amount for a USD rate of one', () => {
    const result = convertUsdToFiat(100, 1, 'USD');

    expect(result).toEqual({ value: 100, currency: 'USD' });
  });

  it('converts USD using the selected currency rate', () => {
    const result = convertUsdToFiat(100, { currency: 'eur', rate: 0.9 });

    expect(result).toEqual({ value: 90, currency: 'EUR' });
  });
});

describe('formatFiat', () => {
  it('formats JPY without fractional digits', () => {
    const result = formatFiat(1234.56, 'JPY', 'en-US');

    expect(result).toBe('+¥1,235');
  });

  it('formats negative PnL with a minus sign', () => {
    const result = formatFiat(-12.34, 'USD', 'en-US');

    expect(result).toBe('-$12.34');
  });
});
