import {
  canAffordPack,
  formatOddsLine,
  formatOddsPercent,
  formatPackPrice,
  formatWholeNumber,
  getPackPriceBaseUnits,
} from './PackCard.utils';

describe('PackCard.utils', () => {
  it('formats odds fractions as percentages', () => {
    expect(formatOddsPercent(0.8)).toBe('80%');
    expect(formatOddsPercent(0.015)).toBe('1.5%');
  });

  it('formats the odds line, most common first, skipping empty tiers', () => {
    const line = formatOddsLine({
      epic: 0.01,
      rare: 0,
      uncommon: 0.19,
      common: 0.8,
    });

    expect(line).toBe('Common 80% · Uncommon 19% · Epic 1%');
  });

  it('formats whole numbers with separators', () => {
    expect(formatWholeNumber(1234.4)).toBe('1,234');
  });

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
