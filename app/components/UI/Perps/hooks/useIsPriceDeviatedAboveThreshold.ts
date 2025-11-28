import { useMemo } from 'react';
import { usePerpsPrices } from './usePerpsPrices';
import { VALIDATION_THRESHOLDS } from '../constants/perpsConfig';

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
 * Compares the current perps price with the spot price (markPrice) and
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
    includeMarketData: false,
    throttleMs: 1000,
  });

  const priceUpdate = symbol ? prices[symbol] : undefined;

  // Calculate price deviation if we have both perps price and spot price (markPrice)
  const isDeviatedAboveThreshold = useMemo(() => {
    if (!symbol || !priceUpdate?.price || !priceUpdate?.markPrice) {
      return false;
    }

    const perpsPrice = Number.parseFloat(priceUpdate.price);
    const spotPrice = Number.parseFloat(priceUpdate.markPrice);

    if (Number.isNaN(perpsPrice) || Number.isNaN(spotPrice)) {
      return false;
    }

    if (perpsPrice <= 0 || spotPrice <= 0) {
      return false;
    }

    const deviation = Math.abs((perpsPrice - spotPrice) / spotPrice);

    const threshold = VALIDATION_THRESHOLDS.PRICE_DEVIATION;

    return deviation > threshold;
  }, [symbol, priceUpdate?.price, priceUpdate?.markPrice]);

  const isLoading = !symbol || !priceUpdate;

  return {
    isDeviatedAboveThreshold,
    isLoading,
  };
};
