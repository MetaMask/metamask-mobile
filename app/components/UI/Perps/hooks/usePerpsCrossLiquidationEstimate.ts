import { debounce } from 'lodash';
import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  CrossLiquidationEstimate,
  EstimateCrossLiquidationParams,
  PerpsProviderType,
} from '@metamask/perps-controller';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import { usePerpsTrading } from './usePerpsTrading';

export interface UsePerpsCrossLiquidationEstimateParams {
  symbol: string;
  /** Order direction, not the direction of the position it leaves. */
  direction: 'long' | 'short';
  /** Unsigned order size in base units. */
  size: string;
  /** Expected fill or limit price. */
  entryPrice: number;
  /** Cross leverage the order sets on the market. */
  leverage: number;
  providerId?: PerpsProviderType;
  /** When false, skips the controller call and returns no estimate. */
  enabled: boolean;
}

export interface UsePerpsCrossLiquidationEstimateOptions {
  debounceMs?: number;
}

/**
 * Pre-trade liquidation price of the Cross position an order would leave, from
 * `PerpsController.estimateCrossLiquidation`. Core reads the account, spot
 * collateral, and market tiers, and covers openings, adds, reduces and flips.
 *
 * Responses are generation-tagged so a slower older request cannot overwrite a
 * newer one. The last estimate stays until the next one arrives, so price
 * ticks do not flash the row back to the fallback.
 *
 * @returns `estimate` is undefined while disabled or before the first result.
 */
export const usePerpsCrossLiquidationEstimate = (
  params: UsePerpsCrossLiquidationEstimateParams,
  options?: UsePerpsCrossLiquidationEstimateOptions,
): {
  estimate: CrossLiquidationEstimate | undefined;
  isCalculating: boolean;
} => {
  const { estimateCrossLiquidation } = usePerpsTrading();
  const [estimate, setEstimate] = useState<CrossLiquidationEstimate>();
  const [isCalculating, setIsCalculating] = useState(false);
  const requestGeneration = useRef(0);

  const debounceMs = options?.debounceMs ?? 0;
  const { symbol, direction, size, entryPrice, leverage, providerId, enabled } =
    params;

  const requestParams = useMemo((): EstimateCrossLiquidationParams | null => {
    const parsedSize = Number.parseFloat(size);
    if (
      !enabled ||
      !symbol ||
      !(entryPrice > 0) ||
      !(leverage > 0) ||
      !(parsedSize > 0)
    ) {
      return null;
    }
    return {
      symbol,
      direction,
      size,
      entryPrice: String(entryPrice),
      leverage,
      providerId,
    };
  }, [enabled, symbol, direction, size, entryPrice, leverage, providerId]);

  const runEstimate = useMemo(
    () =>
      debounce(
        async (
          nextParams: EstimateCrossLiquidationParams,
          generation: number,
        ) => {
          if (generation !== requestGeneration.current) {
            return;
          }
          try {
            const result = await estimateCrossLiquidation(nextParams);
            if (generation === requestGeneration.current) {
              setEstimate(result);
            }
          } catch (err) {
            // Core documents this as never rejecting; a throw here means the
            // controller itself was unavailable.
            DevLogger.log('Error estimating cross liquidation:', err);
            if (generation === requestGeneration.current) {
              setEstimate({ status: 'unavailable', reason: 'provider' });
            }
          } finally {
            if (generation === requestGeneration.current) {
              setIsCalculating(false);
            }
          }
        },
        debounceMs,
      ),
    [estimateCrossLiquidation, debounceMs],
  );

  const estimateTarget = enabled ? `${providerId ?? ''}:${symbol}` : null;

  useEffect(() => {
    setEstimate(undefined);
  }, [estimateTarget]);

  useEffect(() => {
    const generation = ++requestGeneration.current;

    if (!requestParams) {
      setEstimate(undefined);
      setIsCalculating(false);
      return undefined;
    }

    setIsCalculating(true);
    runEstimate(requestParams, generation)?.catch(() => undefined);

    return () => {
      runEstimate.cancel();
      if (requestGeneration.current === generation) {
        requestGeneration.current += 1;
      }
    };
  }, [requestParams, runEstimate]);

  return { estimate, isCalculating };
};
