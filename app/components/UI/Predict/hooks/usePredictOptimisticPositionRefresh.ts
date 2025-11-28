import { useEffect, useRef, useState } from 'react';
import { PredictPosition } from '../types';
import { usePredictPositions } from './usePredictPositions';

interface UsePredictOptimisticPositionRefreshParams {
  position: PredictPosition;
  pollingInterval?: number;
}

/**
 * Hook to handle auto-refresh of optimistic positions
 *
 * When a position is marked as optimistic, this hook:
 * 1. Immediately loads positions to check for updates
 * 2. After each load completes, waits for the polling interval
 * 3. Loads again if the position is still optimistic
 * 4. Stops when the position is no longer optimistic or component unmounts
 *
 * This prevents request pileup on slow connections by waiting for each
 * request to complete before scheduling the next one.
 */
export const usePredictOptimisticPositionRefresh = ({
  position,
  pollingInterval = 2000,
}: UsePredictOptimisticPositionRefreshParams): PredictPosition => {
  const [currentPosition, setCurrentPosition] =
    useState<PredictPosition>(position);

  const { positions, loadPositions } = usePredictPositions({
    marketId: position.marketId,
    loadOnMount: false,
    refreshOnFocus: false,
  });

  // Store loadPositions in a ref to avoid effect restarts when its identity changes
  const loadPositionsRef = useRef(loadPositions);
  loadPositionsRef.current = loadPositions;

  // Update current position when positions from the hook change
  useEffect(() => {
    const updatedPosition = positions.find(
      (p) =>
        p.marketId === position.marketId && p.outcomeId === position.outcomeId,
    );

    if (updatedPosition) {
      setCurrentPosition(updatedPosition);
    }
  }, [positions, position.marketId, position.outcomeId]);

  // Auto-refresh for optimistic positions - sequential loading pattern
  useEffect(() => {
    if (!currentPosition.optimistic) return;

    let shouldContinue = true;
    let timeoutId: NodeJS.Timeout | null = null;

    const pollPositions = async () => {
      if (!shouldContinue) return;

      try {
        await loadPositionsRef.current({ isRefresh: true });
      } catch (error) {
        // Continue polling even if an individual request fails
        // This ensures we keep trying to get updated position data
      }

      // After the response (or error), schedule next poll if still active
      if (shouldContinue) {
        timeoutId = setTimeout(() => {
          pollPositions();
        }, pollingInterval);
      }
    };

    pollPositions();

    return () => {
      shouldContinue = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [currentPosition.optimistic, pollingInterval]);

  return currentPosition;
};
