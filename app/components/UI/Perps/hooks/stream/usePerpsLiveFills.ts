import { useEffect, useState, useRef } from 'react';
import { usePerpsStream } from '../../providers/PerpsStreamManager';
import { DevLogger } from '../../../../../core/SDKConnect/utils/DevLogger';
import type { OrderFill } from '../../controllers/types';

// Stable empty array reference to prevent re-renders
const EMPTY_FILLS: OrderFill[] = [];

export interface UsePerpsLiveFillsOptions {
  /** Throttle delay in milliseconds (default: 0ms for immediate updates) */
  throttleMs?: number;
}

export interface UsePerpsLiveFillsReturn {
  /** Array of order fills */
  fills: OrderFill[];
  /** Whether we're waiting for the first real WebSocket data (not cached) */
  isInitialLoading: boolean;
}

/**
 * Hook for real-time order fill updates via WebSocket subscription
 * Provides immediate notification of trade executions
 *
 * @param options - Configuration options for the hook
 * @returns Object containing fills array and loading state
 */
export function usePerpsLiveFills(
  options: UsePerpsLiveFillsOptions = {},
): UsePerpsLiveFillsReturn {
  const { throttleMs = 0 } = options;
  const stream = usePerpsStream();
  const [fills, setFills] = useState<OrderFill[]>(EMPTY_FILLS);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const lastFillsRef = useRef<OrderFill[]>(EMPTY_FILLS);
  const hasReceivedFirstUpdate = useRef(false);

  useEffect(() => {
    const logMessage = throttleMs
      ? `usePerpsLiveFills: Subscribing with ${throttleMs}ms throttle`
      : `usePerpsLiveFills: Subscribing with no throttle (instant updates)`;
    DevLogger.log(logMessage);

    const unsubscribe = stream.fills.subscribe({
      callback: (newFills) => {
        // null/undefined means no cached data yet, keep loading state
        if (newFills === null || newFills === undefined) {
          // Keep isInitialLoading as true, fills as empty array
          return;
        }

        // We have real data now (either empty array or fills)
        if (!hasReceivedFirstUpdate.current) {
          DevLogger.log('usePerpsLiveFills: Received first WebSocket update', {
            count: newFills?.length ?? 0,
          });
          hasReceivedFirstUpdate.current = true;
          setIsInitialLoading(false);
        }

        // Only update if fills actually changed
        // For empty arrays, use stable reference
        if (newFills.length === 0) {
          if (lastFillsRef.current.length === 0) {
            // Already empty, don't update
            return;
          }
          lastFillsRef.current = EMPTY_FILLS;
          setFills(EMPTY_FILLS);
        } else {
          DevLogger.log('usePerpsLiveFills: Received fill update', {
            count: newFills.length,
          });
          lastFillsRef.current = newFills;
          setFills(newFills);
        }
      },
      throttleMs,
    });

    return () => {
      DevLogger.log('usePerpsLiveFills: Unsubscribing');
      unsubscribe();
    };
  }, [stream, throttleMs]);

  return {
    fills,
    isInitialLoading,
  };
}
