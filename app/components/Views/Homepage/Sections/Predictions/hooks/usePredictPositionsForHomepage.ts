import { useMemo } from 'react';
import { usePredictPositions } from '../../../../../UI/Predict/hooks/usePredictPositions';
import type { PredictPosition } from '../../../../../UI/Predict/types';

export interface UsePredictPositionsForHomepageResult {
  positions: PredictPosition[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<unknown>;
}

interface UsePredictPositionsForHomepageOptions {
  maxPositions?: number;
  enabled?: boolean;
}

/**
 * Lightweight wrapper around the Predict team's usePredictPositions hook,
 * adapted for homepage display with optional slicing.
 *
 * Pass `enabled: false` when the Predict feature flag is off so the parent can
 * keep `PredictionsSection` mounted without subscribing to positions queries.
 */
export const usePredictPositionsForHomepage = (
  options: UsePredictPositionsForHomepageOptions = {},
): UsePredictPositionsForHomepageResult => {
  const { maxPositions, enabled = true } = options;

  const { data, isLoading, error, refetch } = usePredictPositions({
    claimable: false,
    enabled,
    livePriceUpdates: true,
  });

  const allPositions = useMemo(() => data ?? [], [data]);

  const positions = useMemo(
    () =>
      maxPositions !== undefined
        ? allPositions.slice(0, maxPositions)
        : allPositions,
    [allPositions, maxPositions],
  );

  return {
    positions,
    isLoading,
    error: error
      ? error instanceof Error
        ? error.message
        : String(error)
      : null,
    refetch,
  };
};

export default usePredictPositionsForHomepage;
