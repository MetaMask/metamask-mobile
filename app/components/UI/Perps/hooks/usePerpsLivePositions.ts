import { useCallback, useEffect, useState } from 'react';
import type { Position } from '../controllers/types';
import { usePerpsTrading } from './usePerpsTrading';

/**
 * Hook for live position updates (bypasses Redux for performance)
 */
export function usePerpsLivePositions(): Position[] {
  const { subscribeToPositions } = usePerpsTrading();
  const [livePositions, setLivePositions] = useState<Position[]>([]);

  const memoizedCallback = useCallback((positions: Position[]) => {
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
