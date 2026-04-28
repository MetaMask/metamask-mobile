/* eslint-disable @metamask/design-tokens/color-no-hex */
import { getMedalColors, isTopRank, PODIUM_EMOJI } from './topRank.colors';

describe('isTopRank', () => {
  it.each([1, 2, 3])('returns true for podium rank %s', (rank) => {
    expect(isTopRank(rank)).toBe(true);
  });

  it.each([0, 4, 5, 100, -1])('returns false for rank %s', (rank) => {
    expect(isTopRank(rank)).toBe(false);
  });
});

describe('getMedalColors', () => {
  it('returns the gold palette for rank 1', () => {
    const colors = getMedalColors(1);

    expect(colors).not.toBeNull();
    expect(colors?.rankDigit).toBe('#FFEE58');
    expect(colors?.gradient.length).toBeGreaterThanOrEqual(3);
    expect(colors?.gradientLocations.length).toBe(colors?.gradient.length);
  });

  it('returns the silver palette for rank 2', () => {
    expect(getMedalColors(2)?.rankDigit).toBe('#ECEFF1');
  });

  it('returns the bronze palette for rank 3', () => {
    expect(getMedalColors(3)?.rankDigit).toBe('#FFAB40');
  });

  it.each([0, 4, 5, 100, -1])('returns null for rank %s', (rank) => {
    expect(getMedalColors(rank)).toBeNull();
  });
});

describe('PODIUM_EMOJI', () => {
  it('uses a crown for rank 1 and medal emojis for ranks 2 and 3', () => {
    expect(PODIUM_EMOJI[1]).toBe('👑');
    expect(PODIUM_EMOJI[2]).toBe('🥈');
    expect(PODIUM_EMOJI[3]).toBe('🥉');
  });
});
