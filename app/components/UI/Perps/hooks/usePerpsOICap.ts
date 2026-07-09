import { useState, useEffect, useMemo } from 'react';
import { usePerpsStream } from '../providers/PerpsStreamManager';

/**
 * Developer-only override for OI cap state testing
 *
 * - Set to `true` to force isAtCap=true (test warning UI and disabled buttons)
 * - Set to `false` to force isAtCap=false (test normal state even if actually at cap)
 * - Set to `null` for normal behavior (use real WebSocket data)
 *
 * ⚠️ Only active in __DEV__ builds - automatically disabled in production
 *
 * @example
 * ```typescript
 * // Test OI cap warning UI:
 * const FORCE_OI_CAP_STATE: boolean | null = true;
 *
 * // Test normal state:
 * const FORCE_OI_CAP_STATE: boolean | null = false;
 *
 * // Production/normal (default):
 * const FORCE_OI_CAP_STATE: boolean | null = null;
 * ```
 */
const FORCE_OI_CAP_STATE: boolean | null = null;

/**
 * Return type for usePerpsOICap hook
 */
export interface UsePerpsOICapReturn {
  /**
   * Whether the specified symbol is currently at its open interest cap
   */
  isAtCap: boolean;
  /**
   * Loading state - true until first WebSocket data is received
   */
  isLoading: boolean;
}

/**
 * Hook to check if a market is at its open interest cap
 *
 * Uses PerpsStreamManager for centralized subscription management.
 * Leverages the existing webData3 WebSocket subscription which includes
 * `perpsAtOpenInterestCap` field - zero additional network overhead.
 *
 * **Architecture:**
 * - Single shared WebSocket subscription for all component instances
 * - Built-in caching for instant subsequent access
 * - Automatic account switch handling via clearCache()
 * - Consistent with other live data hooks (usePerpsLiveOrders, usePerpsLiveAccount)
 *
 * @param symbol - Market symbol to check (e.g., 'BTC', 'xyz:TSLA')
 * @returns Object with isAtCap and isLoading flags
 *
 * @example
 * ```typescript
 * const { isAtCap, isLoading } = usePerpsOICap(market?.symbol);
 *
 * if (isAtCap) {
 *   // Show warning banner, disable trading buttons
 * }
 * ```
 */
export const usePerpsOICap = (symbol?: string): UsePerpsOICapReturn => {
  const streamManager = usePerpsStream();
  const [oiCaps, setOICaps] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!symbol) return;

    // Subscribe through stream manager (single shared subscription)
    const unsubscribe = streamManager.oiCaps.subscribe({
      callback: (caps: string[]) => {
        setOICaps(caps);
        setIsInitialized(true);
      },
      throttleMs: 0, // No throttle for OI caps (low frequency updates)
    });

    return unsubscribe;
  }, [streamManager, symbol]);

  // Check if the current symbol is in the OI caps list
  const isAtCap = useMemo(() => {
    // Developer override (only in __DEV__ builds)
    if (__DEV__ && FORCE_OI_CAP_STATE !== null) {
      console.warn(
        `[usePerpsOICap] Developer override active: isAtCap=${FORCE_OI_CAP_STATE}`,
      );
      return FORCE_OI_CAP_STATE;
    }

    if (!symbol || !isInitialized) return false;
    return oiCaps.includes(symbol);
  }, [symbol, oiCaps, isInitialized]);

  return {
    isAtCap,
    isLoading: !isInitialized,
  };
};
