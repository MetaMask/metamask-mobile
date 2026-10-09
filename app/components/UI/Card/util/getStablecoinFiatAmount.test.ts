import { getStablecoinFiatAmount } from './getStablecoinFiatAmount';

describe('getStablecoinFiatAmount', () => {
  it('returns balance times usdToFiat when both are finite', () => {
    expect(getStablecoinFiatAmount(10, 0.85)).toBe(8.5);
  });

  it('returns undefined when usdToFiat is missing', () => {
    expect(getStablecoinFiatAmount(10.5, undefined)).toBeUndefined();
  });

  it('returns undefined when balance is not finite', () => {
    expect(getStablecoinFiatAmount(Number.NaN, 1)).toBeUndefined();
    expect(
      getStablecoinFiatAmount(Number.POSITIVE_INFINITY, 1),
    ).toBeUndefined();
  });

  it('returns 0 for a zero balance', () => {
    expect(getStablecoinFiatAmount(0, 1.2)).toBe(0);
  });
});
