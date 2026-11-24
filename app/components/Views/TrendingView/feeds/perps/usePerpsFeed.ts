import { useContext, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  filterMarketsByQuery,
  MARKET_SORTING_CONFIG,
  MarketCategory,
  sortMarkets,
  type PerpsMarketData,
  type SortDirection,
  type SortOptionId,
} from '@metamask/perps-controller';
import { isEquityAsset } from '../../../../UI/Perps/utils/marketHours';
import { usePerpsMarkets } from '../../../../UI/Perps/hooks';
import { PerpsConnectionContext } from '../../../../UI/Perps/providers/PerpsConnectionProvider';
import { selectPerpsWatchlistMarkets } from '../../../../UI/Perps/selectors/perpsController';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { useHomepageSparklines } from '../../../Homepage/Sections/Perpetuals/hooks/useHomepageSparklines';
import { useFeedRefresh } from '../../hooks/useFeedRefresh';
import type { RefreshConfig } from '../../hooks/useExploreRefresh';
import { TILE_CAROUSEL_DEFAULT_MAX_TILES } from '../../components/TileCarousel';
import { fuseSearch, PERPS_FUSE_OPTIONS } from '../search-utils';
import type { PerpsFeedItem } from '../../../../UI/Perps/types/perpsFeedTypes';

export type { PerpsFeedItem } from '../../../../UI/Perps/types/perpsFeedTypes';

const EMPTY_WATCHLIST_SYMBOLS: string[] = [];

export type PerpsVariant = 'all' | 'crypto' | 'rwa';
export type PerpsPriceChangeDirection = 'gainers' | 'losers';

interface UsePerpsFeedOptions {
  /** @default 'all' */
  variant?: PerpsVariant;
  query?: string;
  refresh?: RefreshConfig;
  /** Skips the underlying market fetch until this feed is actually needed. */
  skipInitialFetch?: boolean;
  /**
   * When true, fetch sparklines + watchlist flags and attach them to each item
   * (tile rendering needs this; row rendering does not).
   */
  withTileExtras?: boolean;
}

export interface UsePerpsFeedResult {
  data: PerpsFeedItem[];
  isLoading: boolean;
  refetch: () => Promise<void>;
  /** The sort option ID that matches this feed's sort order — pass to `navigateToPerpsMarketList` so the market list opens consistently sorted. */
  defaultSortOptionId: SortOptionId;
}

/**
 * Maps each feed variant to the sort option ID it uses when displaying items.
 * This is the single source of truth — both the feed's internal sort and the
 * "View All" navigation use this mapping so they stay in sync.
 */
export const PERPS_VARIANT_SORT_OPTION: Record<PerpsVariant, SortOptionId> = {
  all: 'priceChange',
  crypto: 'priceChange',
  rwa: 'priceChange',
};

export const PERPS_PRICE_CHANGE_SORT_DIRECTION: Record<
  PerpsPriceChangeDirection,
  SortDirection
> = {
  gainers: 'desc',
  losers: 'asc',
};

/** Core `sortMarkets` by the option's field and direction, unknown values last. */
const sortFeedMarkets = (
  markets: PerpsMarketData[],
  sortOptionId: SortOptionId,
): PerpsMarketData[] => {
  const option = MARKET_SORTING_CONFIG.SortOptions.find(
    ({ id }) => id === sortOptionId,
  );
  return option
    ? sortMarkets({
        markets,
        sortBy: option.field,
        direction: option.direction,
      })
    : markets;
};

const filterByVariant = (
  markets: PerpsMarketData[],
  variant: PerpsVariant,
): PerpsMarketData[] => {
  switch (variant) {
    case 'crypto':
      return markets.filter((m) => !m.isHip3);
    case 'rwa':
      return markets.filter(
        (m) =>
          isEquityAsset(m.marketType) ||
          m.marketType === MarketCategory.Commodity ||
          m.marketType === MarketCategory.Forex,
      );
    case 'all':
    default:
      return markets;
  }
};

export const filterAndSortByPriceChangeDirection = (
  markets: PerpsMarketData[],
  priceChangeDirection: PerpsPriceChangeDirection,
) => {
  switch (priceChangeDirection) {
    case 'gainers':
      return sortMarkets({
        markets: markets.filter(
          (market) => parseFloat(market.change24hPercent) > 0,
        ),
        sortBy: MARKET_SORTING_CONFIG.SortFields.PriceChange,
        direction: PERPS_PRICE_CHANGE_SORT_DIRECTION.gainers,
      });
    case 'losers':
      return sortMarkets({
        markets: markets.filter(
          (market) => parseFloat(market.change24hPercent) < 0,
        ),
        sortBy: MARKET_SORTING_CONFIG.SortFields.PriceChange,
        direction: PERPS_PRICE_CHANGE_SORT_DIRECTION.losers,
      });
  }
};

/**
 * Perps markets feed. Returns enriched items (market + optional sparkline +
 * watchlist flag) so consumers don't have to stitch data themselves.
 *
 * **Consumers must be wrapped in `<PerpsSectionProvider>`** — `usePerpsMarkets`
 * reads from perps contexts.
 */
export const usePerpsFeed = ({
  variant = 'all',
  query,
  refresh,
  skipInitialFetch = false,
  withTileExtras = false,
}: UsePerpsFeedOptions = {}): UsePerpsFeedResult => {
  const connectionContext = useContext(PerpsConnectionContext);
  const {
    markets,
    isLoading,
    refresh: refetch,
    isRefreshing,
  } = usePerpsMarkets({ skipInitialFetch });

  useFeedRefresh(refresh, refetch);

  const filtered = useMemo<PerpsMarketData[]>(() => {
    if (connectionContext?.error) return [];
    const subset = filterByVariant(markets, variant);
    if (!query) {
      return sortFeedMarkets(subset, PERPS_VARIANT_SORT_OPTION[variant]);
    }
    const queryFiltered = filterMarketsByQuery(subset, query);
    const fused = fuseSearch(queryFiltered, query, PERPS_FUSE_OPTIONS);
    // Preserve Fuse.js relevance ordering (more useful than a metric sort during search).
    return fused;
  }, [connectionContext?.error, markets, variant, query]);

  // Only visible carousel tiles need sparklines. Preserve trends to avoid candle requests.
  const sparklineMarkets = useMemo(
    () =>
      withTileExtras ? filtered.slice(0, TILE_CAROUSEL_DEFAULT_MAX_TILES) : [],
    [filtered, withTileExtras],
  );
  const { sparklines } = useHomepageSparklines(sparklineMarkets);
  const watchlistSymbols =
    useSelector(selectPerpsWatchlistMarkets) ?? EMPTY_WATCHLIST_SYMBOLS;

  const data = useMemo<PerpsFeedItem[]>(
    () =>
      filtered.map((market) => ({
        market,
        sparkline: withTileExtras ? sparklines[market.symbol] : undefined,
        isWatchlisted: watchlistSymbols.includes(market.symbol),
      })),
    [filtered, sparklines, watchlistSymbols, withTileExtras],
  );

  return {
    data,
    isLoading: connectionContext?.error ? false : isLoading || isRefreshing,
    refetch,
    defaultSortOptionId: PERPS_VARIANT_SORT_OPTION[variant],
  };
};
