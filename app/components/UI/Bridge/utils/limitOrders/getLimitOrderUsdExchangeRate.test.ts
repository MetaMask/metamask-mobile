import { getLimitOrderUsdExchangeRate } from './getLimitOrderUsdExchangeRate';

describe('getLimitOrderUsdExchangeRate', () => {
  it('returns the rate of one US dollar in the display currency with its ISO code', () => {
    const result = getLimitOrderUsdExchangeRate('rub', 1 / 85.05);

    expect(result).toStrictEqual({ rate: '85.05', currency: 'RUB' });
  });

  it('rounds a rate of at least one to two decimals', () => {
    const result = getLimitOrderUsdExchangeRate('jpy', 1 / 149.876);

    expect(result).toStrictEqual({ rate: '149.88', currency: 'JPY' });
  });

  it('rounds a rate below one to two decimals', () => {
    const result = getLimitOrderUsdExchangeRate('eur', 1.08);

    expect(result).toStrictEqual({ rate: '0.93', currency: 'EUR' });
  });

  it('keeps two decimals for a whole rate', () => {
    const result = getLimitOrderUsdExchangeRate('rub', 1 / 90);

    expect(result).toStrictEqual({ rate: '90.00', currency: 'RUB' });
  });

  it('formats the rate with locale separators', () => {
    const result = getLimitOrderUsdExchangeRate('idr', 1 / 16250.5);

    expect(result).toStrictEqual({ rate: '16,250.50', currency: 'IDR' });
  });

  it('returns undefined when two decimals would round the rate to zero', () => {
    const result = getLimitOrderUsdExchangeRate('btc', 95000);

    expect(result).toBeUndefined();
  });

  it.each(['usd', 'USD'])(
    'returns undefined when the display currency is %s',
    (currency) => {
      const result = getLimitOrderUsdExchangeRate(currency, 1);

      expect(result).toBeUndefined();
    },
  );

  it.each([undefined, 0, Number.NaN, -1])(
    'returns undefined when the rate is %s',
    (fiatToUsdRate) => {
      const result = getLimitOrderUsdExchangeRate('eur', fiatToUsdRate);

      expect(result).toBeUndefined();
    },
  );

  it('returns undefined without a display currency', () => {
    const result = getLimitOrderUsdExchangeRate(undefined, 1.08);

    expect(result).toBeUndefined();
  });
});
