import { useMemo } from 'react';
import { usePredictPositions } from '../../../../../UI/Predict/hooks/usePredictPositions';
import {
  PredictPositionStatus,
  type PredictPosition,
} from '../../../../../UI/Predict/types';

export interface UsePredictPositionsForHomepageResult {
  positions: PredictPosition[];
  /** Sum of currentValue across won, positive-value claimable positions. */
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
 * TEMP perf-debug switch. CPU profiling showed continuous JS-thread activity
 * from the market-price WebSocket subscription opened whenever homepage
 * positions are non-claimable (`livePriceUpdates: !claimable` below). Flip to
 * true to force `livePriceUpdates: false` and measure its contribution in
 * isolation. Remove this block before merging.
 */
const PERF_DEBUG_SKIP_POSITION_LIVE_PRICES = false;

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

  if (PERF_DEBUG_SKIP_POSITION_LIVE_PRICES && !claimable) {
    console.log(
      '[PERF_DEBUG] skipped position live-price WebSocket subscription (livePriceUpdates forced to false)',
    );
  }

  const { data, isLoading, error, refetch } = usePredictPositions({
    claimable,
    enabled,
    livePriceUpdates: PERF_DEBUG_SKIP_POSITION_LIVE_PRICES
      ? false
      : !claimable,
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
        ? allPositions.reduce(
            (sum, position) =>
              position.status === PredictPositionStatus.WON &&
              (position.currentValue ?? 0) > 0
                ? sum + (position.currentValue ?? 0)
                : sum,
            0,
          )
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
