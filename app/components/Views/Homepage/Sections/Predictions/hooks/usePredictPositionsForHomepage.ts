import { useMemo } from 'react';
import { usePredictPositions } from '../../../../../UI/Predict/hooks/usePredictPositions';
import type { PredictPosition } from '../../../../../UI/Predict/types';

export interface UsePredictPositionsForHomepageResult {
  positions: PredictPosition[];
  /** Sum of currentValue across all claimable positions (only meaningful when claimable: true) */
  totalClaimableValue: number;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

interface UsePredictPositionsForHomepageOptions {
  maxPositions?: number;
  claimable?: boolean;
}

/**
 * Lightweight wrapper around the Predict team's usePredictPositions hook,
 * adapted for homepage display with optional slicing and claimable value sum.
 *
 * The feature flag check is handled at the UI level (Homepage conditionally
 * renders the Predictions section), so this hook assumes it is only called
 * when predictions are enabled.
 */
export const usePredictPositionsForHomepage = (
  options: UsePredictPositionsForHomepageOptions = {},
): UsePredictPositionsForHomepageResult => {
  const { maxPositions, claimable = false } = options;

  const { data, isLoading, error, refetch } = usePredictPositions({
    claimable,
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
    error,
    refetch,
  };
};

export default usePredictPositionsForHomepage;
