import { useEffect, useMemo, useState } from 'react';
import {
  PERFORMANCE_CONFIG,
  type EstimateCrossLiquidationParams,
} from '@metamask/perps-controller';
import Engine from '../../../../core/Engine';

type CrossEstimateInput = Omit<EstimateCrossLiquidationParams, 'entryPrice'> & {
  entryPrice: number | undefined;
  enabled: boolean;
  draftKey: string;
};

/** Get the venue's tiered Cross estimate; never reuse one across accounts or order drafts. */
export function usePerpsCrossLiquidationPrice({
  enabled,
  draftKey,
  symbol,
  direction,
  size,
  entryPrice,
  leverage,
  providerId,
}: CrossEstimateInput): string | undefined {
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
  const activeDraftKey = params ? draftKey : undefined;
  const [result, setResult] = useState<{
    draftKey: string;
    price?: string;
  }>();
  useEffect(() => {
    setResult(undefined);
  }, [activeDraftKey]);

  useEffect(() => {
    if (!params) return;
    let active = true;
    const updateEstimate = async (): Promise<void> => {
      try {
        const estimate =
          await Engine.context.PerpsController.estimateCrossLiquidation(params);
        if (active)
          setResult({
            draftKey,
            price: estimate.status === 'price' ? estimate.price : undefined,
          });
      } catch {
        if (active) setResult(undefined);
      }
    };
    const timer = setTimeout(() => {
      void updateEstimate();
    }, PERFORMANCE_CONFIG.ValidationDebounceMs);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [params, draftKey]);
  return result && result.draftKey === activeDraftKey
    ? result.price
    : undefined;
}
