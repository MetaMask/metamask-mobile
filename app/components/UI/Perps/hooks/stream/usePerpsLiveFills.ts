import { useEffect, useState } from 'react';
import { usePerpsStream } from '../../providers/PerpsStreamManager';
import { DevLogger } from '../../../../../core/SDKConnect/utils/DevLogger';
import type { OrderFill } from '../../controllers/types';

export interface UsePerpsLiveFillsOptions {
  /** Throttle delay in milliseconds (default: 0ms for immediate updates) */
  throttleMs?: number;
}

/**
 * Hook for real-time order fill updates via WebSocket subscription
 * Provides immediate notification of trade executions
 *
 * @param options - Configuration options for the hook
 * @returns Array of order fills with real-time updates
 */
export function usePerpsLiveFills(
  options: UsePerpsLiveFillsOptions = {},
): OrderFill[] {
  const { throttleMs = 0 } = options;
  const stream = usePerpsStream();
  const [fills, setFills] = useState<OrderFill[]>([]);

  useEffect(() => {
    const logMessage = throttleMs
      ? `usePerpsLiveFills: Subscribing with ${throttleMs}ms throttle`
      : `usePerpsLiveFills: Subscribing with no throttle (instant updates)`;
    DevLogger.log(logMessage);

    const unsubscribe = stream.fills.subscribe({
      callback: (newFills) => {
        if (!newFills) {
          return;
        }
        DevLogger.log('usePerpsLiveFills: Received fill update', {
          count: newFills.length,
        });
        setFills(newFills);
      },
      throttleMs,
    });

    return () => {
      DevLogger.log('usePerpsLiveFills: Unsubscribing');
      unsubscribe();
    };
  }, [stream, throttleMs]);

  return fills;
}
