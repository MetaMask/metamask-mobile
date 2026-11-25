import { debounce } from 'lodash';
import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  CrossLiquidationEstimate,
  EstimateCrossLiquidationParams,
  PerpsProviderType,
} from '@metamask/perps-controller';
import Engine from '../../../../core/Engine';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';

export interface UsePerpsCrossLiquidationEstimateParams {
  /** When false, skips the controller call and returns no estimate. */
  enabled: boolean;
  symbol: string | undefined;
  direction: 'long' | 'short';
  /** Unsigned order size in base units. */
  size: string;
  /** Expected fill or limit price. */
  entryPrice: number;
  /** Cross leverage the order sets on the market. */
  leverage: number;
  providerId?: PerpsProviderType;
  /**
   * Changes when the account or position behind the estimate changes, so the
   * controller re-reads it. The controller reads the account itself.
   */
  refreshKey?: string;
  debounceMs?: number;
}

/**
 * Liquidation price of the Cross position an order would leave, from
 * `PerpsController.estimateCrossLiquidation`. The controller prices openings,
 * adds, reduces and flips against the account's Cross collateral and the
 * market's margin tiers.
 *
 * In-flight requests are generation-tagged so a slower older response cannot
 * overwrite a newer estimate. The last estimate is kept until the next one
 * arrives, and is cleared when the market or venue changes.
 *
 * @returns `estimate` is `undefined` while disabled or before the first
 * result for the market.
 */
export const usePerpsCrossLiquidationEstimate = ({
  enabled,
  symbol,
  direction,
  size,
  entryPrice,
  leverage,
  providerId,
  refreshKey,
  debounceMs = 0,
}: UsePerpsCrossLiquidationEstimateParams): {
  estimate: CrossLiquidationEstimate | undefined;
  isCalculating: boolean;
} => {
  const [estimate, setEstimate] = useState<CrossLiquidationEstimate>();
  const [isCalculating, setIsCalculating] = useState(false);
  const requestGeneration = useRef(0);

  const requestParams = useMemo(
    (): EstimateCrossLiquidationParams | null =>
      enabled && symbol
        ? {
            symbol,
            direction,
            size,
            entryPrice: String(entryPrice),
            leverage,
            providerId,
          }
        : null,
    [enabled, symbol, direction, size, entryPrice, leverage, providerId],
  );

  const runEstimate = useMemo(
    () =>
      debounce(
        async (
          nextParams: EstimateCrossLiquidationParams,
          generation: number,
        ) => {
          let result: CrossLiquidationEstimate;
          try {
            result =
              await Engine.context.PerpsController.estimateCrossLiquidation(
                nextParams,
              );
          } catch (error) {
            DevLogger.log('Error estimating cross liquidation:', error);
            result = { status: 'unavailable', reason: 'account_unknown' };
          }
          if (generation !== requestGeneration.current) {
            return;
          }
          setEstimate(result);
          setIsCalculating(false);
        },
        debounceMs,
      ),
    [debounceMs],
  );

  const target = enabled && symbol ? `${providerId ?? ''}:${symbol}` : null;

  useEffect(() => {
    setEstimate(undefined);
  }, [target]);

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
    // refreshKey re-reads the account behind an unchanged order.
  }, [requestParams, runEstimate, refreshKey]);

  return { estimate, isCalculating };
};
