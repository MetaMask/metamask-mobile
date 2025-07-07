import { useCallback, useEffect, useState } from 'react';
import type { Position } from '../controllers/types';
import { usePerpsController } from './usePerpsController';

/**
 * Hook for live position updates (bypasses Redux for performance)
 * Use this for real-time P&L calculations
 */
export function usePerpsLivePositions(): Position[] {
  const { subscribeToPositions } = usePerpsController();
  const [livePositions, setLivePositions] = useState<Position[]>([]);

  const memoizedCallback = useCallback((positions: Position[]) => {
    // Direct UI update, bypasses Redux for maximum performance
    setLivePositions(positions);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToPositions({
      callback: memoizedCallback,
    });

    return unsubscribe;
  }, [subscribeToPositions, memoizedCallback]);

  return livePositions;
}
