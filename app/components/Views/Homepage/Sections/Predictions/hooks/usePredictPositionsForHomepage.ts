import { useMemo } from 'react';
import { usePredictPositions } from '../../../../../UI/Predict/hooks/usePredictPositions';
import type { PredictPosition } from '../../../../../UI/Predict/types';

export interface UsePredictPositionsForHomepageResult {
  positions: PredictPosition[];
  /** Sum of currentValue across all claimable positions (only meaningful when claimable: true) */
  totalClaimableValue: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<unknown>;
}

interface UsePredictPositionsForHomepageOptions {
  maxPositions?: number;
  claimable?: boolean;
  enabled?: boolean;
}

/**
 * Lightweight wrapper around the Predict team's usePredictPositions hook,
 * adapted for homepage display with optional slicing and claimable value sum.
 *
 * Pass `enabled: false` when the Predict feature flag is off so the parent can
 * keep `PredictionsSection` mounted without subscribing to positions queries.
 */
export const usePredictPositionsForHomepage = (
  options: UsePredictPositionsForHomepageOptions = {},
): UsePredictPositionsForHomepageResult => {
  const { maxPositions, claimable = false, enabled = true } = options;

  const { data, isLoading, error, refetch } = usePredictPositions({
    claimable,
    enabled,
  });

  const allPositions = useMemo(() => data ?? [], [data]);

  const positions = useMemo(
    () =>
      maxPositions !== undefined
        ? allPositions.slice(0, maxPositions)
        : allPositions,
    [allPositions, maxPositions],
  );

  const totalClaimableValue = useMemo(
    () =>
      claimable
        ? allPositions.reduce((sum, p) => sum + (p.currentValue ?? 0), 0)
        : 0,
    [claimable, allPositions],
  );

  return {
    positions,
    totalClaimableValue,
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
