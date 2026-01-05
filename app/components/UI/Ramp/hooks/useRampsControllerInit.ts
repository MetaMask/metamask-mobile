import { useEffect, useRef } from 'react';
import useRampsGeolocation from './useRampsGeolocation';

/**
 * Options for the useRampsControllerInit hook.
 */
interface UseRampsControllerInitOptions {
  /**
   * Whether to force a geolocation refresh, bypassing cache.
   * Defaults to false.
   */
  forceGeolocationRefresh?: boolean;
}

/**
 * Hook to initialize the RampsController on mount.
 * Fetches geolocation as part of initialization.
 *
 * @param options - Hook options.
 * @param options.forceGeolocationRefresh - Whether to force a geolocation refresh.
 *
 * @example
 * ```tsx
 * function RampScreen() {
 *   useRampsControllerInit();
 *   const { geolocation, isLoading } = useRampsGeolocation();
 *   // ...
 * }
 * ```
 */
export function useRampsControllerInit(
  options: UseRampsControllerInitOptions = {},
): void {
  const { forceGeolocationRefresh = false } = options;
  const hasInitializedRef = useRef(false);
  const { fetchGeolocation } = useRampsGeolocation();

  useEffect(() => {
    if (hasInitializedRef.current) {
      return;
    }
    hasInitializedRef.current = true;

    fetchGeolocation({ forceRefresh: forceGeolocationRefresh });
  }, [fetchGeolocation, forceGeolocationRefresh]);
}

export default useRampsControllerInit;
