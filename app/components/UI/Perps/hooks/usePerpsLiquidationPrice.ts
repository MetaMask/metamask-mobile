import { useEffect, useState } from 'react';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import { usePerpsTrading } from './usePerpsTrading';

interface LiquidationPriceParams {
  entryPrice: number | undefined;
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

  useEffect(() => {
    if (
      entryPrice === undefined ||
      !Number.isFinite(entryPrice) ||
      entryPrice <= 0 ||
      !Number.isFinite(leverage) ||
      leverage <= 0 ||
      !asset
    ) {
      setLiquidationPrice(undefined);
      setIsCalculating(false);
      setError(null);
      return;
    }

    let active = true;
    setIsCalculating(true);
    setError(null);
    const timer = setTimeout(async () => {
      try {
        const price = await calculateLiquidationPrice({
          entryPrice,
          leverage,
          direction,
          asset,
          marginType: 'isolated',
        });
        if (active) setLiquidationPrice(price);
      } catch (err) {
        if (!active) return;
        DevLogger.log('Error calculating liquidation price:', err);
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to calculate liquidation price',
        );
        setLiquidationPrice(undefined);
      } finally {
        if (active) setIsCalculating(false);
      }
    }, debounceMs);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [
    asset,
    entryPrice,
    leverage,
    direction,
    debounceMs,
    calculateLiquidationPrice,
  ]);

  return {
    liquidationPrice,
    isCalculating,
    error,
  };
};
