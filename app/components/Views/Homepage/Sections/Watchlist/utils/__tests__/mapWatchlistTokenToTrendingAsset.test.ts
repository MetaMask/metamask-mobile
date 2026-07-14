import type { CaipAssetType } from '@metamask/utils';
import type { WatchlistTokenWithBalance } from '../../../../../../UI/Assets/watchlist/utils/addBalanceToTokens';
import { mapWatchlistTokenToTrendingAsset } from '../mapWatchlistTokenToTrendingAsset';

const makeToken = (
  overrides: Partial<WatchlistTokenWithBalance> = {},
): WatchlistTokenWithBalance => ({
  assetId: 'eip155:1/erc20:0xabc' as CaipAssetType,
  symbol: 'TEST',
  name: 'Test Token',
  decimals: 18,
  balance: '100',
  isInWallet: true,
  marketData: {
    price: 1.5,
    pricePercentChange24h: 2.5,
    marketCap: 1_000_000,
    totalVolume: 500_000,
  },
  ...overrides,
});

describe('mapWatchlistTokenToTrendingAsset', () => {
  it('maps all fields correctly', () => {
    const result = mapWatchlistTokenToTrendingAsset(makeToken());

    expect(result).toEqual({
      assetId: 'eip155:1/erc20:0xabc',
      name: 'Test Token',
      symbol: 'TEST',
      decimals: 18,
      price: '1.5',
      marketCap: 1_000_000,
      aggregatedUsdVolume: 500_000,
      priceChangePct: { h24: '2.5' },
    });
  });

  it('defaults price to "0" when marketData.price is undefined', () => {
    const result = mapWatchlistTokenToTrendingAsset(
      makeToken({ marketData: undefined }),
    );

    expect(result.price).toBe('0');
  });

  it('defaults marketCap and volume to 0 when missing', () => {
    const result = mapWatchlistTokenToTrendingAsset(
      makeToken({ marketData: {} }),
    );

    expect(result.marketCap).toBe(0);
    expect(result.aggregatedUsdVolume).toBe(0);
  });

  it('uses volume24h when totalVolume is absent', () => {
    const result = mapWatchlistTokenToTrendingAsset(
      makeToken({
        marketData: { volume24h: 123_456 },
      }),
    );

    expect(result.aggregatedUsdVolume).toBe(123_456);
  });

  it('leaves h24 undefined when pricePercentChange24h is absent', () => {
    const result = mapWatchlistTokenToTrendingAsset(
      makeToken({ marketData: { price: 10 } }),
    );

    expect(result.priceChangePct?.h24).toBeUndefined();
  });
});
