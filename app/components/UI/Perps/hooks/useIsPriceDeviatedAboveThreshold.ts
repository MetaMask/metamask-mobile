import { useMemo } from 'react';
import { usePerpsPrices } from './usePerpsPrices';
import { VALIDATION_THRESHOLDS } from '@metamask/perps-controller';

/**
 * Return type for useIsPriceDeviatedAboveThreshold hook
 */
export interface UseIsPriceDeviatedAboveThresholdReturn {
  /**
   * Whether the perps price has deviated above the threshold from the spot price
   */
  isDeviatedAboveThreshold: boolean;
  /**
   * Loading state - true until price data is available
   */
  isLoading: boolean;
}

/**
 * Hook to check if the perps price has deviated above the threshold from the spot price
 *
 * Uses existing price subscription (no additional network overhead).
 * Compares the current perps price with the spot price (oraclePrice) and
 * determines if the deviation exceeds the configured threshold.
 *
 * **Performance:**
 * - Uses existing price subscription (no additional network overhead)
 * - Memoized calculations to prevent unnecessary re-renders
 * - Returns false immediately if price data is unavailable
 *
 * @param symbol - Market symbol to check (e.g., 'BTC', 'ETH')
 * @returns Object with isDeviatedAboveThreshold and isLoading flags
 *
 * @example
 * ```typescript
 * const { isDeviatedAboveThreshold, isLoading } = useIsPriceDeviatedAboveThreshold('BTC');
 *
 * if (isDeviatedAboveThreshold) {
 *   // Show warning, disable trading buttons
 * }
 * ```
 */
export const useIsPriceDeviatedAboveThreshold = (
  symbol?: string,
): UseIsPriceDeviatedAboveThresholdReturn => {
  const prices = usePerpsPrices(symbol ? [symbol] : [], {
    // oraclePrice is projected from the shared market-data cache, which is only
    // populated while some subscriber requests market data. Opt in so this
    // guard works even when no other subscriber (e.g. usePerpsMarketStats) has
    // warmed the cache — subscriptions are multiplexed, so this adds no extra
    // network overhead when a market-data subscription already exists.
    includeMarketData: true,
    throttleMs: 1000,
  });

  const priceUpdate = symbol ? prices[symbol] : undefined;

  // Calculate price deviation if we have both perps price and spot price (oraclePrice)
  const isDeviatedAboveThreshold = useMemo(() => {
    if (!symbol || !priceUpdate?.price || !priceUpdate?.oraclePrice) {
      return false;
    }

    const perpsPrice = Number.parseFloat(priceUpdate.price);
    const spotPrice = Number.parseFloat(priceUpdate.oraclePrice);

    if (Number.isNaN(perpsPrice) || Number.isNaN(spotPrice)) {
      return false;
    }

    if (perpsPrice <= 0 || spotPrice <= 0) {
      return false;
    }

    const deviation = Math.abs((perpsPrice - spotPrice) / spotPrice);

    const threshold = VALIDATION_THRESHOLDS.PriceDeviation;

    return deviation > threshold;
  }, [symbol, priceUpdate?.price, priceUpdate?.oraclePrice]);

  const isLoading = !symbol || !priceUpdate;

  return {
    isDeviatedAboveThreshold,
    isLoading,
  };
};
