import {
  getSuggestedWatchlistTokens,
  SUGGESTED_WATCHLIST_LIMIT,
} from './getSuggestedWatchlistTokens';
import type { WatchlistTokenWithBalance } from './addBalanceToTokens';

describe('getSuggestedWatchlistTokens', () => {
  const makeToken = (symbol: string): WatchlistTokenWithBalance =>
    ({
      assetId: `eip155:1/erc20:0x${symbol}`,
      symbol,
      name: symbol,
      decimals: 18,
      balance: '0',
      isInWallet: false,
    }) as unknown as WatchlistTokenWithBalance;

  const pool = ['a', 'b', 'c', 'd', 'e', 'f'].map(makeToken);
  const poolIds = pool.map((token) => String(token.assetId));

  it('shows the full limit of suggestions when the watchlist is empty', () => {
    const result = getSuggestedWatchlistTokens(pool, []);
    expect(result).toHaveLength(SUGGESTED_WATCHLIST_LIMIT);
    expect(result.map((token) => token.symbol)).toEqual([
      'a',
      'b',
      'c',
      'd',
      'e',
    ]);
  });

  it('shows limit - watchlistCount suggestions (2 watched → 3)', () => {
    const result = getSuggestedWatchlistTokens(pool, [poolIds[0], poolIds[1]]);
    expect(result).toHaveLength(3);
    expect(result.map((token) => token.symbol)).toEqual(['c', 'd', 'e']);
  });

  it('excludes already-watchlisted tokens from the suggestions', () => {
    const result = getSuggestedWatchlistTokens(pool, [poolIds[3]]);
    // 5 - 1 = 4 suggestions, skipping the watched token 'd'.
    expect(result.map((token) => token.symbol)).toEqual(['a', 'b', 'c', 'e']);
  });

  it('compares asset IDs case-insensitively', () => {
    const result = getSuggestedWatchlistTokens(pool, [
      poolIds[0].toUpperCase(),
    ]);
    expect(result.map((token) => token.symbol)).toEqual(['b', 'c', 'd', 'e']);
  });

  it('floors at one suggestion once the watchlist reaches the limit', () => {
    // Watch the limit (5) tokens — the 6th non-watched pool token still
    // surfaces as a single suggestion.
    const result = getSuggestedWatchlistTokens(pool, poolIds.slice(0, 5));
    expect(result).toHaveLength(1);
    expect(result[0]?.symbol).toBe('f');
  });

  it('returns fewer suggestions when the pool is smaller than the target', () => {
    const result = getSuggestedWatchlistTokens([makeToken('a')], []);
    expect(result).toHaveLength(1);
  });

  it('returns an empty list when every suggested token is watched', () => {
    const smallPool = pool.slice(0, 2);
    const result = getSuggestedWatchlistTokens(smallPool, [
      poolIds[0],
      poolIds[1],
    ]);
    expect(result).toHaveLength(0);
  });

  it('honors a custom limit', () => {
    const result = getSuggestedWatchlistTokens(pool, [poolIds[0]], 3);
    expect(result).toHaveLength(2);
    expect(result.map((token) => token.symbol)).toEqual(['b', 'c']);
  });
});
