import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Engine from '../../../../core/Engine';
import {
  CandlePeriod,
  PERPS_CONSTANTS,
  TimeDuration,
  calculate24hHighLow,
  type PriceUpdate,
} from '@metamask/perps-controller';
import {
  formatFundingRate,
  formatLargeNumber,
  formatPerpsFiat,
  LARGE_NUMBER_RANGES_DETAILED,
  PRICE_RANGES_UNIVERSAL,
} from '../utils/formatUtils';
import { usePerpsMarketContext } from './usePerpsMarketContext';
import { usePerpsLiveCandles } from './stream/usePerpsLiveCandles';
import Logger from '../../../../util/Logger';

interface MarketStats {
  high24h: string;
  low24h: string;
  volume24h: string;
  openInterest: string;
  fundingRate: string;
  currentPrice?: number;
  isLoading: boolean;
  /** Symbol for which both candles and live market statistics have resolved. */
  dataSymbol?: string;
  /** True once the current symbol has real volume/open-interest data. */
  hasLiveData: boolean;
  hasError?: boolean;
}

interface MarketDataUpdate {
  funding?: number;
  openInterest?: number;
  volume24h?: number;
}

/**
 * Hook to fetch and manage comprehensive market statistics
 */
export interface UsePerpsMarketStatsReturn extends MarketStats {
  refresh: () => Promise<void>;
}

export const usePerpsMarketStats = (
  symbol: string,
): UsePerpsMarketStatsReturn => {
  const {
    key: marketContextKey,
    isReady: isMarketContextReady,
    isConnectionInitialized,
  } = usePerpsMarketContext();
  const marketStatsIdentity = `${symbol}|${marketContextKey}`;
  const [marketData, setMarketData] = useState<MarketDataUpdate>({});
  const [marketDataSymbol, setMarketDataSymbol] = useState<string>();
  const [marketDataContextKey, setMarketDataContextKey] = useState<string>();
  const [marketDataErrorContextKey, setMarketDataErrorContextKey] =
    useState<string>();
  const [initialPrice, setInitialPrice] = useState<{
    identity: string;
    value: number;
  }>();
  // The ref prevents a synchronous first tick from retriggering the
  // subscription effect while still allowing each context its own price.
  const initialPriceContextRef = useRef<string | null>(null);
  const marketStatsIdentityRef = useRef(marketStatsIdentity);
  const currentMarketContextRef = useRef(marketContextKey);
  const isMarketContextReadyRef = useRef(isMarketContextReady);
  const isConnectionInitializedRef = useRef(isConnectionInitialized);
  currentMarketContextRef.current = marketContextKey;
  isMarketContextReadyRef.current = isMarketContextReady;
  isConnectionInitializedRef.current = isConnectionInitialized;

  useEffect(() => {
    if (marketStatsIdentityRef.current === marketStatsIdentity) {
      return;
    }
    marketStatsIdentityRef.current = marketStatsIdentity;
    setMarketData({});
    setMarketDataSymbol(undefined);
    setMarketDataContextKey(undefined);
    setMarketDataErrorContextKey(undefined);
    setInitialPrice(undefined);
    initialPriceContextRef.current = null;
  }, [marketStatsIdentity]);

  // Get candlestick data for 24h high/low calculation via WebSocket streaming
  const { candleData, error: candleError } = usePerpsLiveCandles({
    symbol,
    interval: CandlePeriod.OneHour, // Use 1h candles for 24h calculation
    duration: TimeDuration.OneDay,
    throttleMs: 1000,
    resetKey: marketContextKey,
    enabled: isMarketContextReady,
  });

  // Subscribe to market data updates (funding, open interest, volume).
  // Wait for the selected market context so an old provider cannot satisfy the
  // new generation during the reconnect window.
  useEffect(() => {
    if (!symbol || !isMarketContextReady || !isConnectionInitialized) return;

    let unsubscribe: (() => void) | undefined;
    let isActive = true;
    const findSymbol = (update: PriceUpdate) => update.symbol === symbol;

    const callback = (updates: PriceUpdate[]) => {
      if (
        !isActive ||
        !isMarketContextReadyRef.current ||
        !isConnectionInitializedRef.current ||
        currentMarketContextRef.current !== marketContextKey
      ) {
        return;
      }
      const update = updates.find(findSymbol);
      if (update) {
        setMarketDataErrorContextKey(undefined);
        setMarketDataContextKey(marketContextKey);
        setMarketDataSymbol(symbol);
        // Only extract market data, ignore price changes to prevent re-renders
        setMarketData((prev) => {
          // Check if market data actually changed
          if (
            prev.funding === update.funding &&
            prev.openInterest === update.openInterest &&
            prev.volume24h === update.volume24h
          ) {
            return prev; // Return same reference if no change
          }

          return {
            funding: update.funding,
            openInterest: update.openInterest,
            volume24h: update.volume24h,
          };
        });

        // Store initial price only once for high/low calculation fallback
        if (
          initialPriceContextRef.current !== marketStatsIdentity &&
          update.price
        ) {
          initialPriceContextRef.current = marketStatsIdentity;
          setInitialPrice({
            identity: marketStatsIdentity,
            value: Number.parseFloat(update.price),
          });
        }
      }
    };

    const subscribeToMarketData = async () => {
      try {
        // Subscribe to enhanced price updates that include market data
        unsubscribe = Engine.context.PerpsController.subscribeToPrices({
          symbols: [symbol],
          includeMarketData: true,
          callback,
        });
      } catch (error) {
        if (!isActive) return;
        setMarketDataErrorContextKey(marketContextKey);
        Logger.error(
          error instanceof Error ? error : new Error(String(error)),
          {
            tags: { feature: PERPS_CONSTANTS.FeatureName },
            context: {
              name: 'usePerpsMarketStats.subscribeToMarketData',
              data: { message: 'Error subscribing to Perps market data' },
            },
          },
        );
      }
    };

    subscribeToMarketData();

    return () => {
      isActive = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [
    isConnectionInitialized,
    isMarketContextReady,
    marketContextKey,
    marketStatsIdentity,
    symbol,
  ]);

  // Calculate all statistics
  const stats = useMemo<MarketStats>(() => {
    const hasCurrentIdentity =
      marketStatsIdentityRef.current === marketStatsIdentity;
    const currentCandleData =
      isMarketContextReady && hasCurrentIdentity ? candleData : null;
    const { high, low } = calculate24hHighLow(currentCandleData);
    const hasCurrentMarketData = marketDataContextKey === marketContextKey;
    const currentMarketData = hasCurrentMarketData ? marketData : {};
    const fallbackPrice =
      initialPrice?.identity === marketStatsIdentity
        ? initialPrice.value
        : undefined;
    const displayFallbackPrice =
      fallbackPrice !== undefined && fallbackPrice > 0
        ? formatPerpsFiat(fallbackPrice, {
            ranges: PRICE_RANGES_UNIVERSAL,
          })
        : PERPS_CONSTANTS.FallbackPriceDisplay;

    return {
      // 24h high/low from candlestick data, with fallback estimates (4 sig figs)
      high24h:
        high > 0
          ? formatPerpsFiat(high, { ranges: PRICE_RANGES_UNIVERSAL })
          : displayFallbackPrice,
      low24h:
        low > 0
          ? formatPerpsFiat(low, { ranges: PRICE_RANGES_UNIVERSAL })
          : displayFallbackPrice,
      volume24h:
        currentMarketData.volume24h !== undefined
          ? `$${formatLargeNumber(currentMarketData.volume24h, {
              ranges: LARGE_NUMBER_RANGES_DETAILED,
            })}`
          : PERPS_CONSTANTS.FallbackPriceDisplay,
      openInterest:
        currentMarketData.openInterest !== undefined
          ? `$${formatLargeNumber(currentMarketData.openInterest, {
              ranges: LARGE_NUMBER_RANGES_DETAILED,
            })}`
          : PERPS_CONSTANTS.FallbackPriceDisplay,
      fundingRate: formatFundingRate(currentMarketData.funding),
      currentPrice: fallbackPrice,
      isLoading: !currentCandleData,
      dataSymbol:
        currentCandleData?.symbol === symbol &&
        marketDataSymbol === symbol &&
        hasCurrentMarketData
          ? symbol
          : undefined,
      hasLiveData:
        currentCandleData?.symbol === symbol &&
        marketDataSymbol === symbol &&
        hasCurrentMarketData &&
        (currentMarketData.volume24h !== undefined ||
          currentMarketData.openInterest !== undefined),
      hasError:
        hasCurrentIdentity &&
        (marketDataErrorContextKey === marketContextKey ||
          candleError !== null),
    };
  }, [
    candleData,
    candleError,
    initialPrice,
    marketData,
    marketDataContextKey,
    marketDataErrorContextKey,
    marketDataSymbol,
    marketContextKey,
    marketStatsIdentity,
    isMarketContextReady,
    symbol,
  ]);

  // Refresh function - no-op since WebSocket provides real-time updates
  const refresh = useCallback(async () => {
    // WebSocket streaming automatically provides real-time updates
    // No manual refresh needed - data is always current
  }, []);

  // Memoize the final return object to prevent unnecessary re-renders
  return useMemo(
    () => ({
      ...stats,
      refresh,
    }),
    [stats, refresh],
  );
};
