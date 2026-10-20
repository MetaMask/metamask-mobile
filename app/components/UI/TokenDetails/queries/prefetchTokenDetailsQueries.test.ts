import type { QueryClient } from '@tanstack/react-query';
import type { TokenI } from '../../Tokens/types';
import { prefetchTokenDetailsQueries } from './prefetchTokenDetailsQueries';

const token = {
  address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  chainId: '0x1',
} as TokenI;

jest.mock('../../Tokens/util/tokenSecurityBadgeBatch', () => ({
  ...jest.requireActual('../../Tokens/util/tokenSecurityBadgeBatch'),
  requestTokenSecurityForAsset: jest.fn(async () => null),
}));

const assetId = 'eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f';
const checksumAssetId =
  'eip155:1/erc20:0x6B175474E89094C44Da98b954EedeAC495271d0F';

const queryKeyName = (options: { queryKey: readonly unknown[] }): string =>
  String(options.queryKey[1]);

const prefetch = (
  marketDataMissing: boolean,
  hasNativeConversionRate: boolean,
  nextAssetId: string | null = assetId,
) => {
  const query = jest.fn().mockResolvedValue(undefined);
  const prefetchQuery = jest.fn().mockResolvedValue(undefined);
  const queryClient = { query, prefetchQuery } as unknown as QueryClient;
  prefetchTokenDetailsQueries(
    queryClient,
    token,
    nextAssetId,
    'usd',
    marketDataMissing,
    hasNativeConversionRate,
  );
  const queryCalls = query.mock.calls.map(
    (call) => call[0] as { queryKey: readonly unknown[] },
  );
  const prefetchCalls = prefetchQuery.mock.calls.map(
    (call) => call[0] as { queryKey: readonly unknown[] },
  );
  return { queryCalls, prefetchCalls };
};

describe('prefetchTokenDetailsQueries', () => {
  it('prefetches historical prices, ohlcv, spot and security together', () => {
    const { queryCalls } = prefetch(true, true);

    expect(queryCalls.map(queryKeyName)).toStrictEqual([
      'historical-prices',
      'ohlcv-chart',
      'spot-price',
      'securityBadge',
    ]);
    expect(queryCalls[1]?.queryKey).toEqual([
      'token-details',
      'ohlcv-chart',
      assetId,
      '1d',
      null,
      'usd',
    ]);
    expect(queryCalls[2]?.queryKey).toEqual(
      expect.arrayContaining([
        '0x1',
        '0x6B175474E89094C44Da98b954EedeAC495271d0F',
        'usd',
      ]),
    );
  });

  it('skips spot when market data is already in state', () => {
    const { queryCalls } = prefetch(false, true);

    expect(queryCalls.map(queryKeyName)).toStrictEqual([
      'historical-prices',
      'ohlcv-chart',
      'securityBadge',
    ]);
  });

  it('skips the ohlcv prefetch when the asset id is missing', () => {
    const { queryCalls } = prefetch(false, true, null);

    expect(queryCalls.map(queryKeyName)).toStrictEqual([
      'historical-prices',
      'securityBadge',
    ]);
  });

  // Keyed through the same helper the page uses, not the chart's asset id,
  // which is a different identifier for some tokens.
  it('warms security under the key the page will read', () => {
    const { queryCalls } = prefetch(true, true);

    expect(queryCalls[3]?.queryKey).toEqual([
      'tokenList',
      'securityBadge',
      assetId,
    ]);
  });

  it('prefetches /v2/assets so the meme-token check and description are warm', () => {
    const { prefetchCalls } = prefetch(true, true);

    expect(prefetchCalls).toHaveLength(1);
    expect(prefetchCalls[0]?.queryKey).toEqual([
      'token-details',
      'v2-assets',
      checksumAssetId,
    ]);
  });
});
