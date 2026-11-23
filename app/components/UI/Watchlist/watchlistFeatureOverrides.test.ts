import {
  isWatchlistPerpsOverrideEnabled,
  TEMPORARY_ENABLE_WATCHLIST_PERPS,
} from './watchlistFeatureOverrides';

describe('watchlistFeatureOverrides', () => {
  it.each([
    ['development', true],
    ['production', false],
    ['test', false],
  ] as const)('returns %s override state', (nodeEnv, expected) => {
    expect(isWatchlistPerpsOverrideEnabled(nodeEnv)).toBe(expected);
  });

  it('keeps the override disabled in tests', () => {
    expect(TEMPORARY_ENABLE_WATCHLIST_PERPS).toBe(false);
  });
});
