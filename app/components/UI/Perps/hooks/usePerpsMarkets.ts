import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import {
  groupMarketsByMarketKey,
  parseVolume,
  type GroupedPerpsMarket,
  type PerpsMarketData,
  type PerpsProviderType,
} from '@metamask/perps-controller';
import { usePerpsStream } from '../providers/PerpsStreamManager';
import { selectEffectivePerpsVenueFilter } from '../selectors/marketListPreferences';
import { selectPerpsDefaultProvider } from '../selectors/perpsController';
import {
  hasPreloadedData,
  getPreloadedData,
} from './stream/hasCachedPerpsData';
import { filterAndSortMarkets } from '../utils/filterAndSortMarkets';
import { usePerpsMarketContext } from './usePerpsMarketContext';

export type PerpsMarketDataWithVolumeNumber = PerpsMarketData & {
  volumeNumber: number;
};

/**
 * A market-list row (TAT-4407): one row per backend `marketKey`. A row that
 * exists on several venues carries the default provider's data plus every
 * venue row in `venues`; single-venue rows list themselves only. `rowId` is
 * the stable list key.
 */
export type PerpsMarketRow = PerpsMarketDataWithVolumeNumber & {
  /**
   * Stable list identity (TAT-4407): unique per venue row, or per backend
   * `marketKey` when rows are grouped. Always set by usePerpsMarkets; optional
   * so legacy fixtures and direct callers of the shape stay valid.
   */
  rowId?: string;
  /**
   * The venue rows behind this row. A row grouped across venues lists every
   * venue's data, display market first; single-venue rows list themselves.
   */
  venues?: PerpsMarketData[];
};

export interface UsePerpsMarketsResult {
  /**
   * Transformed market data ready for UI consumption
   */
  markets: PerpsMarketRow[];
  /**
   * Loading state for initial data fetch
   */
  isLoading: boolean;
  /**
   * Error state with error message
   */
  error: string | null;
  /** Whether the current market channel has delivered, including an empty list. */
  hasResolvedInitialData?: boolean;
  /**
   * Refresh function to manually refetch data
   */
  refresh: () => Promise<void>;
  /**
   * Indicates if data is being refreshed
   */
  isRefreshing: boolean;
}

export interface UsePerpsMarketsOptions {
  /** Return every venue listing, independent of browsing preferences. */
  fullCatalog?: boolean;
  /**
   * Enable automatic polling for live updates
   * @default false
   */
  enablePolling?: boolean;
  /**
   * Polling interval in milliseconds
   * @default 60000 (1 minute)
   */
  pollingInterval?: number;
  /**
   * Skip initial data fetch on mount
   * @default false
   */
  skipInitialFetch?: boolean;
  /**
   * Show markets with zero or invalid volume
   * @default __DEV__ (true in development, false in production)
   */
  showZeroVolume?: boolean;
  /**
   * Show markets with zero or invalid open interest
   * @default showZeroVolume
   */
  showZeroOpenInterest?: boolean;
}

// Re-export parseVolume for backward compatibility
export { parseVolume };

/**
 * Filter the venue rows to the selected providers, sort, then group with the
 * core helper (TAT-4407). Mobile adds no grouping or display-venue rule of its
 * own: the backend joins markets under a `marketKey`, and core decides which
 * rows group and which venue's data a row displays (the default provider's
 * when it lists the market). Filtered-out venues drop their rows; a market on
 * only selected venues shows that venue's data.
 */
// Results keyed by the input array reference + options, so an unchanged
// channel snapshot does not produce a new rows reference on every delivery
// (mirrors the WeakMap cache in filterAndSortMarkets).
const rowsByInput = new WeakMap<
  PerpsMarketData[],
  Map<string, PerpsMarketRow[]>
>();

const computeRows = (
  marketData: PerpsMarketData[],
  {
    showZeroVolume,
    showZeroOpenInterest,
    selectedProviderIds,
    defaultProvider,
  }: {
    showZeroVolume: boolean;
    showZeroOpenInterest: boolean;
    selectedProviderIds: PerpsProviderType[] | undefined;
    defaultProvider: PerpsProviderType;
  },
): PerpsMarketRow[] => {
  const filtered =
    selectedProviderIds && selectedProviderIds.length > 0
      ? marketData.filter(
          (market) =>
            !market.providerId ||
            selectedProviderIds.includes(market.providerId),
        )
      : marketData;
  const sorted = filterAndSortMarkets({
    marketData: filtered,
    showZeroVolume,
    showZeroOpenInterest,
  });
  const grouped = groupMarketsByMarketKey(sorted, defaultProvider);
  return grouped.map((row: GroupedPerpsMarket) => ({
    ...row,
    volumeNumber: parseVolume(row.volume),
  }));
};

const toRows = (
  marketData: PerpsMarketData[],
  {
    showZeroVolume,
    showZeroOpenInterest,
    selectedProviderIds,
    defaultProvider,
  }: {
    showZeroVolume: boolean;
    showZeroOpenInterest: boolean;
    selectedProviderIds: PerpsProviderType[] | undefined;
    defaultProvider: PerpsProviderType;
  },
): PerpsMarketRow[] => {
  const optionsKey = `${showZeroVolume}:${showZeroOpenInterest}:${defaultProvider}:${selectedProviderIds?.join(',') ?? ''}`;
  let byOptions = rowsByInput.get(marketData);
  if (!byOptions) {
    byOptions = new Map();
    rowsByInput.set(marketData, byOptions);
  }
  const cached = byOptions.get(optionsKey);
  if (cached) {
    return cached;
  }
  const result = computeRows(marketData, {
    showZeroVolume,
    showZeroOpenInterest,
    selectedProviderIds,
    defaultProvider,
  });
  byOptions.set(optionsKey, result);
  return result;
};

/**
 * Custom hook to fetch and manage Perps market data from the active provider
 * Uses the StreamManager's marketData channel for caching and deduplication
 */
export const usePerpsMarkets = (
  options: UsePerpsMarketsOptions = {},
): UsePerpsMarketsResult => {
  const {
    enablePolling = false,
    pollingInterval = 60000, // 1 minute default
    skipInitialFetch = false,
    showZeroVolume = __DEV__, // Show zero-volume markets in development mode
    showZeroOpenInterest = showZeroVolume,
  } = options;

  const streamManager = usePerpsStream();
  const { identityKey: marketIdentityKey, isReady: isMarketContextReady } =
    usePerpsMarketContext();
  // TAT-4407: effective venue filter (saved selection ∩ available venues,
  // at least one venue) and the routing default provider, both consumed by
  // core's groupMarketsByMarketKey.
  const selectedProviderIds = useSelector(selectEffectivePerpsVenueFilter);
  // Reactive (TAT-4407 fix): grouping must follow the live default provider,
  // not the value captured on first mount.
  const defaultProvider =
    useSelector(selectPerpsDefaultProvider) ?? 'hyperliquid';
  const initialChannelMarkets = streamManager.marketData.getSnapshot();
  const [catalog, setCatalog] = useState<PerpsMarketData[]>(
    () =>
      initialChannelMarkets ??
      getPreloadedData<PerpsMarketData[]>('cachedMarketData') ??
      [],
  );
  const markets = options.fullCatalog
    ? filterAndSortMarkets({
        marketData: catalog,
        showZeroVolume: true,
        showZeroOpenInterest: true,
      })
    : toRows(catalog, {
        showZeroVolume,
        showZeroOpenInterest,
        selectedProviderIds,
        defaultProvider,
      });
  const [isLoading, setIsLoading] = useState(() => {
    if (initialChannelMarkets !== null && initialChannelMarkets !== undefined) {
      return false;
    }
    const hit = hasPreloadedData('cachedMarketData');
    const loading = skipInitialFetch ? false : !hit;
    return loading;
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasResolvedInitialData, setHasResolvedInitialData] = useState(
    () =>
      skipInitialFetch ||
      (initialChannelMarkets !== null && initialChannelMarkets !== undefined) ||
      hasPreloadedData('cachedMarketData'),
  );

  const previousMarketIdentityKeyRef = useRef(marketIdentityKey);
  const hasResidentMarketData =
    previousMarketIdentityKeyRef.current === marketIdentityKey &&
    hasResolvedInitialData;
  const isMarketSubscriptionReady =
    isMarketContextReady || hasResidentMarketData;
  useEffect(() => {
    if (previousMarketIdentityKeyRef.current === marketIdentityKey) {
      return;
    }
    previousMarketIdentityKeyRef.current = marketIdentityKey;
    setCatalog([]);
    setError(null);
    setHasResolvedInitialData(skipInitialFetch);
    setIsLoading(!skipInitialFetch);
  }, [marketIdentityKey, skipInitialFetch]);

  // Manual refresh function
  const refresh = useCallback(async (): Promise<void> => {
    try {
      setIsRefreshing(true);
      setError(null);

      // Force refresh the market data
      await streamManager.marketData.refresh();

      DevLogger.log('Perps: Manual refresh completed');
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      DevLogger.log('Perps: Failed to refresh market data', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [streamManager.marketData]);

  // Subscribe to market data updates
  useEffect(() => {
    if (skipInitialFetch) {
      setIsLoading(false);
      setHasResolvedInitialData(true);
      return;
    }
    if (!isMarketSubscriptionReady) {
      setIsLoading(true);
      setHasResolvedInitialData(false);
      return;
    }

    let isActive = true;
    let isFirstUpdate = true;
    const subscriptionStartTime = Date.now();

    const unsubscribe = streamManager.marketData.subscribe({
      callback: (marketData) => {
        if (!isActive) return;
        if (marketData !== null && marketData !== undefined) {
          setHasResolvedInitialData(
            marketData.length > 0 ||
              streamManager.marketData.getLastDeliveredAt() !== null,
          );
        }
        const receiveTime = Date.now();
        const timeToData = receiveTime - subscriptionStartTime;
        if (marketData && marketData.length > 0) {
          setCatalog(marketData);
          setIsLoading(false);
          setError(null);

          if (isFirstUpdate) {
            DevLogger.log('Perps: Market data received (first load)', {
              marketCount: marketData.length,
              timeToDataMs: timeToData,
              source: timeToData < 100 ? 'cache' : 'fresh_fetch',
              cacheHit: timeToData < 100,
            });
            isFirstUpdate = false;
          } else {
            DevLogger.log('Perps: Market data updated', {
              marketCount: marketData.length,
            });
          }
        } else if (marketData) {
          // Empty array
          setCatalog([]);
          setIsLoading(false);
          if (isFirstUpdate) {
            DevLogger.log('Perps: No market data available', {
              timeToDataMs: timeToData,
            });
            isFirstUpdate = false;
          }
        }
      },
      throttleMs: 0, // No throttle for market data updates
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [
    isMarketSubscriptionReady,
    marketIdentityKey,
    streamManager.marketData,
    skipInitialFetch,
  ]);

  // Polling effect
  useEffect(() => {
    if (!enablePolling) return;

    const intervalId = setInterval(async () => {
      try {
        await streamManager.marketData.refresh();
      } catch (err) {
        DevLogger.log('Perps: Polling refresh failed', err);
      }
    }, pollingInterval);

    return () => clearInterval(intervalId);
  }, [enablePolling, pollingInterval, streamManager.marketData]);

  return {
    markets,
    isLoading,
    error,
    hasResolvedInitialData,
    refresh,
    isRefreshing,
  };
};
