import type { QueryClient } from '@tanstack/react-query';
import type { TokenI } from '../../Tokens/types';
import {
  buildTokenDetailsPrefetchInput,
  prefetchTokenDetailsQueries,
} from './prefetchTokenDetailsQueries';

const token = {
  address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  chainId: '0x1',
} as TokenI;

const assetId = 'eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f';

const queryKeyName = (options: { queryKey: readonly unknown[] }): string =>
  String(options.queryKey[1]);

describe('buildTokenDetailsPrefetchInput', () => {
  it('includes spot when Redux has no price for the token', () => {
    const input = buildTokenDetailsPrefetchInput({
      token,
      assetId,
      currentCurrency: 'usd',
      marketDataRate: undefined,
      nativeConversionRate: 2000,
    });

    expect(input.spot).toStrictEqual({
      chainId: '0x1',
      tokenAddress: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
      currency: 'usd',
    });
    expect(input.historical?.timePeriod).toBe('1d');
    expect(input.ohlcv).toStrictEqual({
      assetId,
      timePeriod: '1d',
      interval: '1m',
      vsCurrency: 'usd',
    });
  });

  it('omits spot when market data is already in state', () => {
    const input = buildTokenDetailsPrefetchInput({
      token,
      assetId,
      currentCurrency: 'usd',
      marketDataRate: 1,
      nativeConversionRate: 2000,
    });

    expect(input.spot).toBeNull();
    expect(input.assetId).toBe(assetId);
    expect(input.historical).not.toBeNull();
  });

  it('omits the asset and ohlcv prefetches when the asset id is missing', () => {
    const input = buildTokenDetailsPrefetchInput({
      token,
      assetId: null,
      currentCurrency: 'usd',
      marketDataRate: 1,
      nativeConversionRate: 2000,
    });

    expect(input.assetId).toBeNull();
    expect(input.ohlcv).toBeNull();
    expect(input.historical).not.toBeNull();
  });
});

describe('prefetchTokenDetailsQueries', () => {
  it('prefetches assets, historical prices, ohlcv, and spot together', () => {
    const query = jest.fn().mockResolvedValue(undefined);
    const queryClient = { query } as unknown as QueryClient;
    const input = buildTokenDetailsPrefetchInput({
      token,
      assetId,
      currentCurrency: 'usd',
      marketDataRate: undefined,
      nativeConversionRate: 2000,
    });

    prefetchTokenDetailsQueries(queryClient, input);

    expect(query).toHaveBeenCalledTimes(4);
    expect(
      query.mock.calls.map((call) =>
        queryKeyName(call[0] as { queryKey: readonly unknown[] }),
      ),
    ).toStrictEqual([
      'v2-assets',
      'historical-prices',
      'ohlcv-chart',
      'spot-price',
    ]);
  });

  it('skips the spot prefetch when spot is omitted', () => {
    const query = jest.fn().mockResolvedValue(undefined);
    const queryClient = { query } as unknown as QueryClient;
    const input = buildTokenDetailsPrefetchInput({
      token,
      assetId,
      currentCurrency: 'usd',
      marketDataRate: 1,
      nativeConversionRate: 2000,
    });

    prefetchTokenDetailsQueries(queryClient, input);

    expect(query).toHaveBeenCalledTimes(3);
    expect(
      query.mock.calls.map((call) =>
        queryKeyName(call[0] as { queryKey: readonly unknown[] }),
      ),
    ).toStrictEqual(['v2-assets', 'historical-prices', 'ohlcv-chart']);
  });
});
