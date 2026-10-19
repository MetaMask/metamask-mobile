import { DEFAULT_FILTERS } from './filterDefaults';
import {
  matchesShellAssetType,
  matchesShellFollowing,
  matchesShellMarketCap,
} from './matchShellFilters';
import type { SocialShellFilters } from './types';

const filters = (
  patch: Partial<SocialShellFilters> = {},
): SocialShellFilters => ({
  ...DEFAULT_FILTERS,
  ...patch,
});

describe('matchesShellAssetType', () => {
  it('keeps every class when type is all', () => {
    expect(matchesShellAssetType('spot', DEFAULT_FILTERS)).toBe(true);
    expect(matchesShellAssetType('perps', DEFAULT_FILTERS)).toBe(true);
  });

  it('keeps only spot for the tokens chip', () => {
    expect(matchesShellAssetType('spot', filters({ type: 'tokens' }))).toBe(
      true,
    );
    expect(matchesShellAssetType('perps', filters({ type: 'tokens' }))).toBe(
      false,
    );
  });

  it('keeps only perps for the perps chip', () => {
    expect(matchesShellAssetType('perps', filters({ type: 'perps' }))).toBe(
      true,
    );
    expect(matchesShellAssetType('spot', filters({ type: 'perps' }))).toBe(
      false,
    );
  });
});

describe('matchesShellFollowing', () => {
  it('keeps every trader when following is all', () => {
    expect(matchesShellFollowing({ following: 'all' })).toBe(true);
  });

  it('keeps followed traders when following is selected', () => {
    expect(
      matchesShellFollowing({ following: 'following', isFollowing: true }),
    ).toBe(true);
  });

  it('drops unfollowed traders when following is selected', () => {
    expect(
      matchesShellFollowing({ following: 'following', isFollowing: false }),
    ).toBe(false);
  });
});

describe('matchesShellMarketCap', () => {
  it('keeps every row on the default slider', () => {
    expect(matchesShellMarketCap(5_200_000_000, DEFAULT_FILTERS)).toBe(true);
    expect(matchesShellMarketCap(null, DEFAULT_FILTERS)).toBe(true);
  });

  it('drops a spot cap outside the slider', () => {
    expect(
      matchesShellMarketCap(
        5_200_000_000,
        filters({ marketCap: { min: 0, max: 1 } }),
      ),
    ).toBe(false);
  });

  it('lets a missing cap pass a narrowed slider', () => {
    expect(
      matchesShellMarketCap(null, filters({ marketCap: { min: 0, max: 1 } })),
    ).toBe(true);
  });
});
