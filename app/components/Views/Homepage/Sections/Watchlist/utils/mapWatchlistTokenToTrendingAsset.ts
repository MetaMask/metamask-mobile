import type { TrendingAsset } from '@metamask/assets-controllers';
import type { WatchlistTokenWithBalance } from '../../../../../UI/Assets/watchlist/utils/addBalanceToTokens';

/**
 * Maps a hydrated watchlist token to the `TrendingAsset` shape expected by
 * `TrendingTokenRowItem`. Fields that have no watchlist equivalent are set
 * to safe defaults so the row renders correctly.
 */
export const mapWatchlistTokenToTrendingAsset = (
  token: WatchlistTokenWithBalance,
): TrendingAsset => ({
  assetId: String(token.assetId),
  name: token.name,
  symbol: token.symbol,
  decimals: token.decimals,
  price: token.marketData?.price != null ? String(token.marketData.price) : '0',
  marketCap: token.marketData?.marketCap ?? 0,
  aggregatedUsdVolume:
    token.marketData?.totalVolume ?? token.marketData?.volume24h ?? 0,
  priceChangePct: {
    h24:
      token.marketData?.pricePercentChange24h != null
        ? String(token.marketData.pricePercentChange24h)
        : undefined,
  },
});
