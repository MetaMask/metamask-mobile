import { useEffect, useMemo, useState } from 'react';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import type { LiquidationPriceParams } from '@metamask/perps-controller';
import { usePerpsTrading } from './usePerpsTrading';

interface LiquidationPriceOptions {
  debounceMs?: number;
  /** Selected wallet and network for an account-aware preview. */
  contextKey?: string;
}

/**
 * Requests an estimate for the current inputs and ignores results from an
 * earlier order draft or trading context.
 */
export const usePerpsLiquidationPrice = (
  params: LiquidationPriceParams,
  { debounceMs = 0, contextKey }: LiquidationPriceOptions = {},
) => {
  const { calculateLiquidationPrice } = usePerpsTrading();
  const {
    entryPrice,
    leverage,
    direction,
    asset,
    marginType = 'isolated',
    positionSize,
    providerId,
  } = params;
  const request = useMemo(
    () => ({
      contextKey,
      params: {
        entryPrice,
        leverage,
        direction,
        asset,
        marginType,
        ...(positionSize !== undefined && { positionSize }),
        ...(providerId !== undefined && { providerId }),
      },
    }),
    [
      contextKey,
      entryPrice,
      leverage,
      direction,
      asset,
      marginType,
      positionSize,
      providerId,
    ],
  );
  const [result, setResult] = useState<{
    request: typeof request;
    price?: string;
    error: string | null;
  }>();
  const canEstimate =
    !!asset &&
    Number.isFinite(entryPrice) &&
    entryPrice > 0 &&
    Number.isFinite(leverage) &&
    leverage >= 1 &&
    (marginType !== 'cross' ||
      (positionSize !== undefined &&
        Number.isFinite(positionSize) &&
        positionSize > 0));

  useEffect(() => {
    if (!canEstimate) return;

    let current = true;
    const timeout = setTimeout(async () => {
      try {
        const price = await calculateLiquidationPrice(request.params);
        if (current) setResult({ request, price, error: null });
      } catch (err) {
        if (!current) return;
        DevLogger.log('Error calculating liquidation price:', err);
        setResult({
          request,
          error:
            err instanceof Error
              ? err.message
              : 'Failed to calculate liquidation price',
        });
      }
    }, debounceMs);
    return () => {
      current = false;
      clearTimeout(timeout);
    };
  }, [request, canEstimate, calculateLiquidationPrice, debounceMs]);

  const currentResult =
    canEstimate && result?.request === request ? result : undefined;
  return {
    liquidationPrice: currentResult?.price,
    isCalculating: canEstimate && currentResult === undefined,
    error: currentResult?.error ?? null,
  };
};
