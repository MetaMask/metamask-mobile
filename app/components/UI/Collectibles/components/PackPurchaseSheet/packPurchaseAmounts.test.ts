import {
  formatPurchaseAmount,
  getMaximumAffordableQuantity,
  normalizePurchaseQuantity,
} from './packPurchaseAmounts';

describe('purchase review amounts', () => {
  it.each([
    [0n, 0],
    [49_999_999n, 0],
    [50_000_000n, 1],
    [149_999_999n, 2],
    [150_000_000n, 3],
    [1_000_000_000n, 5],
  ])('limits Max for a balance of %s to %s packs', (balance, maximum) => {
    expect(getMaximumAffordableQuantity(balance, 50_000_000n)).toBe(maximum);
  });

  it('does not divide by zero for an unavailable price', () => {
    expect(getMaximumAffordableQuantity(50_000_000n, 0n)).toBe(0);
  });

  it.each([
    [Number.NaN, 1],
    [Number.POSITIVE_INFINITY, 1],
    [-1, 1],
    [2.8, 2],
    [6, 5],
  ])('normalizes restored quantity %s to %s', (quantity, expected) => {
    expect(normalizePurchaseQuantity(quantity)).toBe(expected);
  });

  it('formats whole and fractional USDC amounts in dollars', () => {
    expect(formatPurchaseAmount(50_000_000n)).toBe('$50');
    expect(formatPurchaseAmount(50_120_000n)).toBe('$50.12');
  });
});
