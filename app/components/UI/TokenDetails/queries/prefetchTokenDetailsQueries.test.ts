import type { QueryClient } from '@tanstack/react-query';
import type { TokenI } from '../../Tokens/types';
import { prefetchTokenDetailsQueries } from './prefetchTokenDetailsQueries';

const token = {
  address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  chainId: '0x1',
} as TokenI;

const assetId = 'eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f';

const queryKeyName = (options: { queryKey: readonly unknown[] }): string =>
  String(options.queryKey[1]);

const prefetch = (
  marketDataMissing: boolean,
  hasNativeConversionRate: boolean,
  nextAssetId: string | null = assetId,
) => {
  const query = jest.fn().mockResolvedValue(undefined);
  const queryClient = { query } as unknown as QueryClient;
  prefetchTokenDetailsQueries(
    queryClient,
    token,
    nextAssetId,
    'usd',
    marketDataMissing,
    hasNativeConversionRate,
  );
  return query.mock.calls.map(
    (call) => call[0] as { queryKey: readonly unknown[] },
  );
};

describe('prefetchTokenDetailsQueries', () => {
  it('prefetches assets, historical prices, ohlcv, and spot together', () => {
    const calls = prefetch(true, true);

    expect(calls.map(queryKeyName)).toStrictEqual([
      'v2-assets',
      'historical-prices',
      'ohlcv-chart',
      'spot-price',
    ]);
    expect(calls[2]?.queryKey).toEqual([
      'token-details',
      'ohlcv-chart',
      assetId,
      '1d',
      null,
      'usd',
    ]);
    expect(calls[3]?.queryKey).toEqual(
      expect.arrayContaining([
        '0x1',
        '0x6B175474E89094C44Da98b954EedeAC495271d0F',
        'usd',
      ]),
    );
  });

  it('skips spot when market data is already in state', () => {
    const calls = prefetch(false, true);

    expect(calls.map(queryKeyName)).toStrictEqual([
      'v2-assets',
      'historical-prices',
      'ohlcv-chart',
    ]);
  });

  it('skips the asset and ohlcv prefetches when the asset id is missing', () => {
    const calls = prefetch(false, true, null);

    expect(calls.map(queryKeyName)).toStrictEqual(['historical-prices']);
  });
});
