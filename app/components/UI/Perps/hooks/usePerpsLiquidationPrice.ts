import { debounce } from 'lodash';
import { useEffect, useMemo, useState } from 'react';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import { usePerpsTrading } from './usePerpsTrading';

interface LiquidationPriceParams {
  entryPrice: number;
  leverage: number;
  direction: 'long' | 'short';
  asset: string;
}

interface LiquidationPriceOptions {
  debounceMs?: number; // Optional debounce delay, defaults to 300ms
}

/**
 * Hook to calculate liquidation price based on trading parameters
 * @param params - Parameters for liquidation price calculation
 * @param options - Optional configuration including debounce delay
 * @returns The liquidation price, `undefined` while the estimate is unavailable
 * (invalid inputs, not yet calculated, or rejected). Format it for display.
 */
export const usePerpsLiquidationPrice = (
  params: LiquidationPriceParams,
  options?: LiquidationPriceOptions,
): {
  liquidationPrice: string | undefined;
  isCalculating: boolean;
  error: string | null;
} => {
  const { calculateLiquidationPrice } = usePerpsTrading();
  const [liquidationPrice, setLiquidationPrice] = useState<string>();
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceMs = options?.debounceMs ?? 0;
  const { entryPrice, leverage, direction, asset } = params;

  const calculatePrice = useMemo(
    () =>
      debounce(async () => {
        // Skip calculation if invalid parameters
        if (entryPrice <= 0 || leverage <= 0 || !asset) {
          setLiquidationPrice(undefined);
          return;
        }

        try {
          setIsCalculating(true);
          setError(null);

          const price = await calculateLiquidationPrice({
            entryPrice,
            leverage,
            direction,
            asset,
            marginType: 'isolated', // We use isolated margin for all orders
          });

          setLiquidationPrice(price);
        } catch (err) {
          DevLogger.log('Error calculating liquidation price:', err);
          const errorMessage =
            err instanceof Error
              ? err.message
              : 'Failed to calculate liquidation price';

          setError(errorMessage);

          // A rejected estimate is unavailable, not a zero liquidation price.
          setLiquidationPrice(undefined);
        } finally {
          setIsCalculating(false);
        }
      }, debounceMs),
    [
      entryPrice,
      leverage,
      direction,
      asset,
      calculateLiquidationPrice,
      debounceMs,
    ],
  );

  useEffect(() => {
    // Set calculating to true immediately when parameters change
    if (entryPrice > 0 && leverage > 0 && asset) {
      setIsCalculating(true);
    }

    calculatePrice()?.catch(() => undefined);

    // Cleanup debounced function on unmount
    return (): void => {
      calculatePrice.cancel();
    };
  }, [calculatePrice, entryPrice, leverage, asset]);

  return {
    liquidationPrice,
    isCalculating,
    error,
  };
};
