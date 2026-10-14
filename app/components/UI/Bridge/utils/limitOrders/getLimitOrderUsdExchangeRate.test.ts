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

  it('rounds a rate below one to three significant digits', () => {
    const result = getLimitOrderUsdExchangeRate('eur', 1.08);

    expect(result).toStrictEqual({ rate: '0.926', currency: 'EUR' });
  });

  // Two decimals would show 0.01, half again off the actual rate.
  it('keeps significant digits for a rate between one cent and one', () => {
    const result = getLimitOrderUsdExchangeRate('ltc', 1 / 0.0149);

    expect(result).toStrictEqual({ rate: '0.0149', currency: 'LTC' });
  });

  it('formats the rate with locale separators', () => {
    const result = getLimitOrderUsdExchangeRate('idr', 1 / 16250.5);

    expect(result).toStrictEqual({ rate: '16,250.50', currency: 'IDR' });
  });

  it('keeps significant digits when two decimals would round the rate to zero', () => {
    const result = getLimitOrderUsdExchangeRate('btc', 95000);

    expect(result).toStrictEqual({ rate: '0.0000105', currency: 'BTC' });
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
