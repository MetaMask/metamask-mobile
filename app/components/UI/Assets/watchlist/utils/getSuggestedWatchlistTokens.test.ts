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

  const buildPool = (symbols: string[]): WatchlistTokenWithBalance[] =>
    symbols.map(makeToken);
  const buildWatchedIds = (
    pool: WatchlistTokenWithBalance[],
    watchedSymbols: string[],
  ): string[] =>
    pool
      .filter((token) => watchedSymbols.includes(String(token.symbol)))
      .map((token) => String(token.assetId));

  const defaultPoolSymbols = ['a', 'b', 'c', 'd', 'e', 'f'];

  interface SuggestedTokensTestCase {
    description: string;
    poolSymbols: string[];
    watchedSymbols: string[];
    expectedSymbols: string[];
    limit?: number;
    uppercaseWatchedIds?: boolean;
  }

  const testCases: SuggestedTokensTestCase[] = [
    {
      description:
        'shows the full limit of suggestions when the watchlist is empty',
      poolSymbols: defaultPoolSymbols,
      watchedSymbols: [],
      expectedSymbols: ['a', 'b', 'c', 'd', 'e'],
    },
    {
      description:
        'shows limit minus watchlist count suggestions (2 watched → 3)',
      poolSymbols: defaultPoolSymbols,
      watchedSymbols: ['a', 'b'],
      expectedSymbols: ['c', 'd', 'e'],
    },
    {
      description: 'excludes already-watchlisted tokens from the suggestions',
      poolSymbols: defaultPoolSymbols,
      watchedSymbols: ['d'],
      expectedSymbols: ['a', 'b', 'c', 'e'],
    },
    {
      description: 'compares asset IDs case-insensitively',
      poolSymbols: defaultPoolSymbols,
      watchedSymbols: ['a'],
      expectedSymbols: ['b', 'c', 'd', 'e'],
      uppercaseWatchedIds: true,
    },
    {
      description: 'shows no suggestions once the watchlist reaches the limit',
      poolSymbols: defaultPoolSymbols,
      watchedSymbols: ['a', 'b', 'c', 'd', 'e'],
      expectedSymbols: [],
    },
    {
      description: 'shows no suggestions when the watchlist exceeds the limit',
      poolSymbols: defaultPoolSymbols,
      watchedSymbols: ['a', 'b', 'c', 'd', 'e', 'f'],
      expectedSymbols: [],
    },
    {
      description:
        'returns fewer suggestions when the pool is smaller than the target',
      poolSymbols: ['a'],
      watchedSymbols: [],
      expectedSymbols: ['a'],
    },
    {
      description:
        'returns an empty list when every suggested token is watched',
      poolSymbols: ['a', 'b'],
      watchedSymbols: ['a', 'b'],
      expectedSymbols: [],
    },
    {
      description: 'honors a custom limit',
      poolSymbols: defaultPoolSymbols,
      watchedSymbols: ['a'],
      expectedSymbols: ['b', 'c'],
      limit: 3,
    },
  ];

  it.each(testCases)('$description', ({ ...testCase }) => {
    const pool = buildPool(testCase.poolSymbols);
    let watchedIds = buildWatchedIds(pool, testCase.watchedSymbols);
    if (testCase.uppercaseWatchedIds) {
      watchedIds = watchedIds.map((id) => id.toUpperCase());
    }

    const result = getSuggestedWatchlistTokens(
      pool,
      watchedIds,
      testCase.limit,
    );

    expect(result.map((token) => token.symbol)).toEqual(
      testCase.expectedSymbols,
    );
  });

  it('keeps the suggestion limit aligned with the perps watchlist flow', () => {
    expect(SUGGESTED_WATCHLIST_LIMIT).toBe(5);
  });

  it('deviates from the perps flow: no floor-of-one once the watchlist is full', () => {
    // Perps keeps one suggestion at the limit; the token watchlist caps at
    // zero so the homepage never shows suggestions past its row budget.
    const pool = buildPool(defaultPoolSymbols);
    const watchedIds = buildWatchedIds(pool, ['a', 'b', 'c', 'd', 'e']);

    const perpsStyle = Math.max(
      1,
      SUGGESTED_WATCHLIST_LIMIT - watchedIds.length,
    );
    expect(perpsStyle).toBe(1); // sanity: the perps floor would show one

    expect(getSuggestedWatchlistTokens(pool, watchedIds)).toEqual([]);
  });
});
