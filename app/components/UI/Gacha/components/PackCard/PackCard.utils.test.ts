import {
  canAffordPack,
  formatPackPrice,
  getPackPriceBaseUnits,
} from './PackCard.utils';

describe('PackCard.utils', () => {
  it('formats pack prices', () => {
    expect(formatPackPrice(50)).toBe('50');
    expect(formatPackPrice(12.5)).toBe('12.50');
  });

  it('converts a pack price to USDC base units', () => {
    expect(getPackPriceBaseUnits(12.5)).toBe(12_500_000n);
  });

  it('compares the balance with the pack price', () => {
    expect(canAffordPack(50_000_000n, 50)).toBe(true);
    expect(canAffordPack(49_999_999n, 50)).toBe(false);
  });
});
