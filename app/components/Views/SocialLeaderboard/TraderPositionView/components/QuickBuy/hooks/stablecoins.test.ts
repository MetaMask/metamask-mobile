import { isStablecoinSymbol } from './stablecoins';

describe('isStablecoinSymbol', () => {
  it('returns true for known stablecoin symbols', () => {
    expect(isStablecoinSymbol('USDC')).toBe(true);
    expect(isStablecoinSymbol('USDT')).toBe(true);
    expect(isStablecoinSymbol('mUSD')).toBe(true);
  });

  it('matches case-insensitively', () => {
    expect(isStablecoinSymbol('usdc')).toBe(true);
    expect(isStablecoinSymbol('MUSD')).toBe(true);
  });

  it('returns false for non-stablecoin symbols', () => {
    expect(isStablecoinSymbol('CAKE')).toBe(false);
    expect(isStablecoinSymbol('ETH')).toBe(false);
  });

  it('returns false for an undefined symbol', () => {
    expect(isStablecoinSymbol(undefined)).toBe(false);
  });
});
