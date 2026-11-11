import {
  LIMIT_ORDER_PRICE_DECIMALS,
  formatLimitOrderFiatInputPrice,
  formatLimitOrderFiatInputPriceFromTokenAmount,
  formatLimitOrderFiatPrice,
  formatLimitOrderFiatPriceFromTokenAmount,
  getLimitOrderFiatPriceDecimals,
  roundLimitOrderMarketFiatToInput,
} from './formatLimitOrderFiatPrice';

describe('getLimitOrderFiatPriceDecimals', () => {
  it.each([4321.5, 12.34, 1, 1.0001, '2200.5'])(
    'returns two decimals for a price of %s',
    (price) => {
      expect(getLimitOrderFiatPriceDecimals(price)).toBe(2);
    },
  );

  it.each([
    { price: 0.99, expected: 4 },
    { price: 0.103, expected: 4 },
    { price: 0.004, expected: 6 },
    { price: 0.0000039998, expected: 9 },
    { price: '0.0000042', expected: 9 },
  ])(
    'returns $expected decimals for a sub-dollar price of $price',
    ({ price, expected }) => {
      expect(getLimitOrderFiatPriceDecimals(price)).toBe(expected);
    },
  );

  it.each([undefined, 0, -1, NaN, Infinity])(
    'returns two decimals for an unusable price of %s',
    (price) => {
      expect(getLimitOrderFiatPriceDecimals(price)).toBe(2);
    },
  );
});

describe('formatLimitOrderFiatPrice', () => {
  it('keeps sub-dollar fiat digits instead of rounding to cents', () => {
    const result = formatLimitOrderFiatPrice(0.10298176120674981);

    expect(result).toBe('0.10298176');
  });

  it('trims trailing zeros on whole-dollar amounts', () => {
    const result = formatLimitOrderFiatPrice(100);

    expect(result).toBe('100');
  });

  it('returns undefined for non-positive amounts', () => {
    expect(formatLimitOrderFiatPrice(0)).toBeUndefined();
    expect(formatLimitOrderFiatPrice(-1)).toBeUndefined();
    expect(formatLimitOrderFiatPrice(undefined)).toBeUndefined();
  });
});

describe('formatLimitOrderFiatPriceFromTokenAmount', () => {
  it('converts a token amount to a high-precision fiat unit price', () => {
    const result = formatLimitOrderFiatPriceFromTokenAmount(
      '0.000042061',
      2448.4,
    );

    expect(result).not.toBe('0.1');
    expect(Number(result)).toBeCloseTo(0.102982, 5);
  });

  it('returns undefined when the fiat rate is missing', () => {
    const result = formatLimitOrderFiatPriceFromTokenAmount('1', undefined);

    expect(result).toBeUndefined();
  });
});

describe('formatLimitOrderFiatInputPrice', () => {
  it('rounds to two decimal places', () => {
    expect(formatLimitOrderFiatInputPrice(2345.6789)).toBe('2345.68');
    expect(formatLimitOrderFiatInputPrice(0.10298176120674981)).toBe('0.1');
  });

  it('accepts string amounts', () => {
    expect(formatLimitOrderFiatInputPrice('1999.994')).toBe('1999.99');
  });

  it('trims trailing zeros', () => {
    expect(formatLimitOrderFiatInputPrice(100)).toBe('100');
    expect(formatLimitOrderFiatInputPrice('100.50')).toBe('100.5');
  });

  it('returns undefined when the amount rounds down to zero', () => {
    expect(formatLimitOrderFiatInputPrice(0.004)).toBeUndefined();
  });

  it('rounds to the given decimal places', () => {
    expect(formatLimitOrderFiatInputPrice(0.0000037998, 9)).toBe('0.0000038');
    expect(formatLimitOrderFiatInputPrice(0.10298176120674981, 4)).toBe(
      '0.103',
    );
  });

  it('returns undefined for unusable amounts', () => {
    expect(formatLimitOrderFiatInputPrice(0)).toBeUndefined();
    expect(formatLimitOrderFiatInputPrice(-1)).toBeUndefined();
    expect(formatLimitOrderFiatInputPrice('')).toBeUndefined();
    expect(formatLimitOrderFiatInputPrice(undefined)).toBeUndefined();
    expect(formatLimitOrderFiatInputPrice(NaN)).toBeUndefined();
  });
});

describe('formatLimitOrderFiatInputPriceFromTokenAmount', () => {
  it('converts a token amount to a fiat unit price with two decimal places', () => {
    const result = formatLimitOrderFiatInputPriceFromTokenAmount(
      '0.000042061',
      2448.4,
    );

    expect(result).toBe('0.1');
  });

  it('converts a token amount to a fiat unit price with the given decimal places', () => {
    const result = formatLimitOrderFiatInputPriceFromTokenAmount(
      '0.0000038',
      0.9998,
      9,
    );

    expect(result).toBe('0.000003799');
  });

  it('returns undefined when the fiat rate or amount is missing', () => {
    expect(
      formatLimitOrderFiatInputPriceFromTokenAmount('1', undefined),
    ).toBeUndefined();
    expect(
      formatLimitOrderFiatInputPriceFromTokenAmount(undefined, 2000),
    ).toBeUndefined();
  });
});

describe('roundLimitOrderMarketFiatToInput', () => {
  it('rounds a market price to the given decimal places', () => {
    expect(roundLimitOrderMarketFiatToInput(4321.987654321, 2)).toBe(4321.99);
    expect(roundLimitOrderMarketFiatToInput(0.10298176120674981, 4)).toBe(
      0.103,
    );
    expect(roundLimitOrderMarketFiatToInput(0.0000039998123, 9)).toBe(0.000004);
  });

  it('returns a market price too small to survive rounding as is', () => {
    expect(roundLimitOrderMarketFiatToInput(0.004, 2)).toBe(0.004);
  });

  it('returns undefined when there is no market price', () => {
    expect(roundLimitOrderMarketFiatToInput(undefined, 2)).toBeUndefined();
  });
});

describe('LIMIT_ORDER_PRICE_DECIMALS', () => {
  it('allows up to 18 fraction digits', () => {
    expect(LIMIT_ORDER_PRICE_DECIMALS).toBe(18);
  });
});
