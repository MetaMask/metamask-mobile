import { useContext, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  filterMarketsByQuery,
  type PerpsMarketData,
} from '@metamask/perps-controller';
import { usePerpsMarkets } from '../../../../UI/Perps/hooks';
import type { PerpsMarketDataWithVolumeNumber } from '../../../../UI/Perps/hooks/usePerpsMarkets';
import { PerpsConnectionContext } from '../../../../UI/Perps/providers/PerpsConnectionProvider';
import { selectPerpsWatchlistMarkets } from '../../../../UI/Perps/selectors/perpsController';
import { useHomepageSparklines } from '../../../Homepage/Sections/Perpetuals/hooks/useHomepageSparklines';
import { useFeedRefresh } from '../../hooks/useFeedRefresh';
import type { RefreshConfig } from '../../hooks/useExploreRefresh';
import { fuseSearch, PERPS_FUSE_OPTIONS } from '../search-utils';

const EMPTY_WATCHLIST_SYMBOLS: string[] = [];

export type PerpsVariant = 'all' | 'crypto' | 'rwa' | 'macro';

interface UsePerpsFeedOptions {
  /** @default 'all' */
  variant?: PerpsVariant;
  query?: string;
  refresh?: RefreshConfig;
  /**
   * When true, fetch sparklines + watchlist flags and attach them to each item
   * (tile rendering needs this; row rendering does not).
   */
  withTileExtras?: boolean;
}

/** Per-item enrichment merged in when `withTileExtras` is true. */
export interface PerpsFeedItem {
  market: PerpsMarketData;
  sparkline?: number[];
  isWatchlisted: boolean;
}

export interface UsePerpsFeedResult {
  data: PerpsFeedItem[];
  isLoading: boolean;
  refetch: () => Promise<void>;
}

const sortByVolumeDesc = (a: PerpsMarketData, b: PerpsMarketData) => {
  const av = (a as PerpsMarketDataWithVolumeNumber).volumeNumber ?? 0;
  const bv = (b as PerpsMarketDataWithVolumeNumber).volumeNumber ?? 0;
  return bv - av;
};

const sortByChange24hDesc = (a: PerpsMarketData, b: PerpsMarketData) =>
  (parseFloat(b.change24hPercent) || 0) - (parseFloat(a.change24hPercent) || 0);

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
          m.marketType === 'equity' ||
          m.marketType === 'commodity' ||
          m.marketType === 'forex',
      );
    case 'macro':
      return markets.filter(
        (m) => m.marketType === 'equity' || m.marketType === 'commodity',
      );
    case 'all':
    default:
      return markets;
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
  withTileExtras = false,
}: UsePerpsFeedOptions = {}): UsePerpsFeedResult => {
  const connectionContext = useContext(PerpsConnectionContext);
  const {
    markets,
    isLoading,
    refresh: refetch,
    isRefreshing,
  } = usePerpsMarkets();

  useFeedRefresh(refresh, refetch);

  const filtered = useMemo<PerpsMarketData[]>(() => {
    if (connectionContext?.error) return [];
    const subset = filterByVariant(markets, variant);
    if (!query) {
      return [...subset].sort(
        variant === 'macro' ? sortByVolumeDesc : sortByChange24hDesc,
      );
    }
    const queryFiltered = filterMarketsByQuery(subset, query);
    const fused = fuseSearch(queryFiltered, query, PERPS_FUSE_OPTIONS);
    return variant === 'macro' ? [...fused].sort(sortByVolumeDesc) : fused;
  }, [connectionContext?.error, markets, variant, query]);

  const symbols = useMemo(
    () => (withTileExtras ? filtered.map((m) => m.symbol) : []),
    [filtered, withTileExtras],
  );
  const { sparklines } = useHomepageSparklines(symbols);
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
  };
};
