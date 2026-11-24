import { useEffect, useMemo, useState } from 'react';
import {
  PERFORMANCE_CONFIG,
  type EstimateCrossLiquidationParams,
} from '@metamask/perps-controller';
import Engine from '../../../../core/Engine';
import { usePerpsLiveAccount } from './stream';

type CrossEstimateInput = Omit<EstimateCrossLiquidationParams, 'entryPrice'> & {
  entryPrice: number | undefined;
  enabled: boolean;
  contextKey: string;
};

/** Get the venue's tiered Cross estimate; never reuse one across accounts or order drafts. */
export function usePerpsCrossLiquidationPrice({
  enabled,
  contextKey,
  symbol,
  direction,
  size,
  entryPrice,
  leverage,
  providerId,
}: CrossEstimateInput): string | undefined {
  const { account } = usePerpsLiveAccount({ enabled });
  const params = useMemo(
    () =>
      enabled &&
      entryPrice !== undefined &&
      entryPrice > 0 &&
      Number(size) > 0 &&
      leverage > 0
        ? {
            symbol,
            direction,
            size,
            entryPrice: String(entryPrice),
            leverage,
            providerId,
          }
        : undefined,
    [enabled, symbol, direction, size, entryPrice, leverage, providerId],
  );
  const [result, setResult] = useState<{
    params: EstimateCrossLiquidationParams;
    contextKey: string;
    price?: string;
  }>();
  useEffect(() => {
    if (!params) return;
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const estimate =
          await Engine.context.PerpsController.estimateCrossLiquidation(params);
        if (active)
          setResult({
            params,
            contextKey,
            price: estimate.status === 'price' ? estimate.price : undefined,
          });
      } catch {
        if (active) setResult(undefined);
      }
    }, PERFORMANCE_CONFIG.ValidationDebounceMs);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [
    params,
    contextKey,
    account?.crossMarginSummary?.accountValue,
    account?.crossMarginSummary?.maintenanceMargin,
    account?.spotCollateral,
  ]);
  return result && result.params === params && result.contextKey === contextKey
    ? result.price
    : undefined;
}
