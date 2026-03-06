import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { usePredictPositions } from '../../../../../UI/Predict/hooks/usePredictPositions';
import { selectPredictEnabledFlag } from '../../../../../UI/Predict';
import type { PredictPosition } from '../../../../../UI/Predict/types';

export interface UsePredictPositionsForHomepageResult {
  positions: PredictPosition[];
  /** Sum of currentValue across all claimable positions (only meaningful when claimable: true) */
  totalClaimableValue: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

interface UsePredictPositionsForHomepageOptions {
  maxPositions?: number;
  claimable?: boolean;
}

/**
 * Lightweight wrapper around the Predict team's usePredictPositions hook,
 * adapted for homepage display with optional slicing and claimable value sum.
 *
 * Delegates all caching, deduplication, and error handling to the underlying
 * React Query-backed hook.
 */
export const usePredictPositionsForHomepage = (
  options: UsePredictPositionsForHomepageOptions = {},
): UsePredictPositionsForHomepageResult => {
  const { maxPositions, claimable = false } = options;
  const isPredictEnabled = useSelector(selectPredictEnabledFlag);

  const { data, isLoading, error, refetch } = usePredictPositions({
    enabled: isPredictEnabled,
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

  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    positions,
    totalClaimableValue,
    isLoading,
    error: error
      ? error instanceof Error
        ? error.message
        : String(error)
      : null,
    refresh,
  };
};

export default usePredictPositionsForHomepage;
