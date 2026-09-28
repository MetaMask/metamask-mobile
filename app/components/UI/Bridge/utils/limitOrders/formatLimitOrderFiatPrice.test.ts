import {
  LIMIT_ORDER_FIAT_PRICE_DECIMALS,
  formatLimitOrderFiatPrice,
  formatLimitOrderFiatPriceFromTokenAmount,
} from './formatLimitOrderFiatPrice';

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

describe('LIMIT_ORDER_FIAT_PRICE_DECIMALS', () => {
  it('allows up to 18 fiat fraction digits', () => {
    expect(LIMIT_ORDER_FIAT_PRICE_DECIMALS).toBe(18);
  });
});
