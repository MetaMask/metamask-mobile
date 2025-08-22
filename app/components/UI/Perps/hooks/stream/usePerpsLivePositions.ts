import { useEffect, useState, useRef } from 'react';
import { usePerpsStream } from '../../providers/PerpsStreamManager';
import { DevLogger } from '../../../../../core/SDKConnect/utils/DevLogger';
import {
  shouldDisablePerpsStreaming,
  getE2EMockData,
  subscribeToE2EMockDataChanges,
} from '../../utils/e2eUtils';
import type { Position } from '../../controllers/types';

// Stable empty array reference to prevent re-renders
const EMPTY_POSITIONS: Position[] = [];

export interface UsePerpsLivePositionsOptions {
  /** Throttle delay in milliseconds (default: 0 - no throttling for instant updates) */
  throttleMs?: number;
}

export interface UsePerpsLivePositionsReturn {
  /** Array of current positions */
  positions: Position[];
  /** Whether we're waiting for the first real WebSocket data (not cached) */
  isInitialLoading: boolean;
}

/**
 * Hook for real-time position updates via WebSocket subscription
 * Replaces the old polling-based usePerpsPositions hook
 *
 * Positions update instantly by default since changes are important
 * (TP/SL modifications, liquidations, etc.) and users need immediate feedback.
 *
 * @param options - Configuration options for the hook
 * @returns Object containing positions array and loading state
 */
export function usePerpsLivePositions(
  options: UsePerpsLivePositionsOptions = {},
): UsePerpsLivePositionsReturn {
  const [e2ePositions, setE2ePositions] = useState<Position[]>([]);

  // E2E Mode: Use reactive mock data
  if (shouldDisablePerpsStreaming()) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
      // Initialize with current mock data
      const mockData = getE2EMockData();
      setE2ePositions(mockData.positions as Position[]);

      // Subscribe to changes
      const unsubscribe = subscribeToE2EMockDataChanges(() => {
        const updatedMockData = getE2EMockData();
        setE2ePositions(updatedMockData.positions as Position[]);
        DevLogger.log(
          'usePerpsLivePositions: E2E mock positions updated',
          updatedMockData.positions,
        );
      });

      return unsubscribe;
    }, []);

    return {
      positions: e2ePositions,
      isInitialLoading: false,
    };
  }

  const { throttleMs = 0 } = options; // No throttling by default for instant updates
  const stream = usePerpsStream();
  const [positions, setPositions] = useState<Position[]>(EMPTY_POSITIONS);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const lastPositionsRef = useRef<Position[]>(EMPTY_POSITIONS);
  const hasReceivedFirstUpdate = useRef(false);

  useEffect(() => {
    const unsubscribe = stream.positions.subscribe({
      callback: (newPositions) => {
        if (!newPositions) {
          return;
        }

        // Mark that we've received the first real WebSocket update
        if (!hasReceivedFirstUpdate.current) {
          DevLogger.log(
            'usePerpsLivePositions: Received first WebSocket update',
          );
          hasReceivedFirstUpdate.current = true;
          setIsInitialLoading(false);
        }
        // Only update if positions actually changed
        // For empty arrays, use stable reference
        if (newPositions.length === 0) {
          if (lastPositionsRef.current.length === 0) {
            // Already empty, don't update
            return;
          }
          lastPositionsRef.current = EMPTY_POSITIONS;
          setPositions(EMPTY_POSITIONS);
        } else {
          lastPositionsRef.current = newPositions;
          setPositions(newPositions);
        }
      },
      throttleMs,
    });

    return () => {
      unsubscribe();
    };
  }, [stream, throttleMs]);

  return {
    positions,
    isInitialLoading,
  };
}
