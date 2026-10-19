import {
  getLimitOrderFiatPriceDecimals,
  getLimitOrderPriceDecimals,
  getLimitOrderSecondaryTokenPriceDecimals,
  getLimitOrderTokenPriceDecimals,
} from './getLimitOrderPriceDecimals';

describe('getLimitOrderPriceDecimals', () => {
  it.each([
    { marketPrice: 0.0000042, expected: 9 },
    { marketPrice: '0.0000042', expected: 9 },
    { marketPrice: 0.5, expected: 4 },
    { marketPrice: 0.01, expected: 5 },
  ])(
    'returns $expected decimals for 4 significant digits of $marketPrice',
    ({ marketPrice, expected }) => {
      const result = getLimitOrderPriceDecimals({
        marketPrice,
        minDecimals: 2,
        significantDigits: 4,
      });

      expect(result).toBe(expected);
    },
  );

  it('never returns fewer than the minimum decimals', () => {
    const result = getLimitOrderPriceDecimals({
      marketPrice: 4321.5,
      minDecimals: 2,
      significantDigits: 4,
    });

    expect(result).toBe(2);
  });

  it.each([undefined, 0, -1, NaN, Infinity])(
    'returns the minimum decimals for an unusable market price of %s',
    (marketPrice) => {
      const result = getLimitOrderPriceDecimals({
        marketPrice,
        minDecimals: 6,
        significantDigits: 4,
      });

      expect(result).toBe(6);
    },
  );
});

describe('getLimitOrderFiatPriceDecimals', () => {
  it.each([4321.5, 12.34, 1, 1.0001])(
    'returns two decimals for a market price of %s',
    (marketFiat) => {
      expect(getLimitOrderFiatPriceDecimals(marketFiat)).toBe(2);
    },
  );

  it.each([
    { marketFiat: 0.99, expected: 4 },
    { marketFiat: 0.103, expected: 4 },
    { marketFiat: 0.004, expected: 6 },
    { marketFiat: 0.0000039998, expected: 9 },
  ])(
    'returns $expected decimals for a sub-dollar market price of $marketFiat',
    ({ marketFiat, expected }) => {
      expect(getLimitOrderFiatPriceDecimals(marketFiat)).toBe(expected);
    },
  );

  it('returns two decimals when there is no market price', () => {
    expect(getLimitOrderFiatPriceDecimals(undefined)).toBe(2);
  });
});

describe('getLimitOrderTokenPriceDecimals', () => {
  it('keeps the counter token decimals when they are precise enough', () => {
    const result = getLimitOrderTokenPriceDecimals({
      counterFiatRate: 2000,
      counterTokenDecimals: 18,
      marketFiat: 100,
    });

    expect(result).toBe(18);
  });

  it('exceeds the counter token decimals for a quoted token worth less than its smallest unit', () => {
    const result = getLimitOrderTokenPriceDecimals({
      counterFiatRate: 0.9998,
      counterTokenDecimals: 6,
      marketFiat: 0.0000039998,
    });

    expect(result).toBe(11);
  });

  it('keeps the counter token decimals when a fiat rate is missing', () => {
    expect(
      getLimitOrderTokenPriceDecimals({
        counterFiatRate: undefined,
        counterTokenDecimals: 6,
        marketFiat: 0.0000039998,
      }),
    ).toBe(6);
    expect(
      getLimitOrderTokenPriceDecimals({
        counterFiatRate: 1,
        counterTokenDecimals: 6,
        marketFiat: undefined,
      }),
    ).toBe(6);
  });

  it('returns undefined when the counter token decimals are unknown', () => {
    const result = getLimitOrderTokenPriceDecimals({
      counterFiatRate: 1,
      counterTokenDecimals: undefined,
      marketFiat: 0.0000039998,
    });

    expect(result).toBeUndefined();
  });
});

describe('getLimitOrderSecondaryTokenPriceDecimals', () => {
  it('returns five decimals for a quoted token worth a meaningful share of the counter token', () => {
    const result = getLimitOrderSecondaryTokenPriceDecimals({
      counterFiatRate: 2000,
      marketFiat: 100,
    });

    expect(result).toBe(5);
  });

  it('returns enough decimals for a cheap quoted token to keep four significant digits', () => {
    const result = getLimitOrderSecondaryTokenPriceDecimals({
      counterFiatRate: 4000,
      marketFiat: 0.0000039998,
    });

    expect(result).toBe(13);
  });

  it('returns five decimals when a fiat rate is missing', () => {
    const result = getLimitOrderSecondaryTokenPriceDecimals({
      counterFiatRate: undefined,
      marketFiat: 0.0000039998,
    });

    expect(result).toBe(5);
  });
});
