import { useCallback, useEffect, useState } from 'react';
import Engine from '../../../../core/Engine';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';

interface UsePerpsOICapReturn {
  isAtCap: boolean;
  isLoading: boolean;
}

/**
 * Hook to monitor if a market is at its open interest cap
 * Uses real-time WebSocket data from webData2 subscription
 *
 * @param symbol - Market symbol to check (e.g., "BTC", "xyz:TSLA")
 * @returns Object with isAtCap (boolean) and isLoading (boolean) flags
 *
 * @example
 * ```typescript
 * const { isAtCap, isLoading } = usePerpsOICap("BTC");
 * if (isAtCap) {
 *   // Show warning, disable trading buttons
 * }
 * ```
 */
export const usePerpsOICap = (symbol?: string): UsePerpsOICapReturn => {
  const [oiCaps, setOICaps] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Subscribe to OI cap updates via WebSocket
  useEffect(() => {
    if (!symbol) return;

    let unsubscribe: (() => void) | undefined;

    const subscribe = async () => {
      try {
        const controller = Engine.context.PerpsController;

        DevLogger.log('Subscribing to OI caps for symbol:', symbol);

        // Subscribe to real-time OI cap updates (uses selected account by default)
        unsubscribe = controller.subscribeToOICaps({
          callback: (caps: string[]) => {
            DevLogger.log('OI caps received:', caps);
            setOICaps(caps);
            setIsInitialized(true);
          },
        });
      } catch (error) {
        console.error('Failed to subscribe to OI caps:', error);
        setIsInitialized(true); // Mark as initialized even on error to prevent infinite loading
      }
    };

    subscribe();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [symbol]);

  // Check if the current symbol is at cap
  const isAtCap = useCallback(() => {
    if (!symbol || !isInitialized) return false;
    return oiCaps.includes(symbol);
  }, [symbol, oiCaps, isInitialized])();

  return {
    isAtCap,
    isLoading: !isInitialized,
  };
};
