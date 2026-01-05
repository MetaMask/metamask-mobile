import { useEffect, useRef } from 'react';
import useRampsGeolocation from './useRampsGeolocation';

/**
 * Options for the useRampsControllerInit hook.
 */
export interface UseRampsControllerInitOptions {
  /**
   * Whether to force a geolocation refresh even if cached data exists.
   */
  forceGeolocationRefresh?: boolean;
}

/**
 * Hook to initialize the RampsController on mount.
 * Fetches geolocation as part of initialization.
 *
 * @param options - Hook options.
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
  }, [forceGeolocationRefresh, fetchGeolocation]);
}

export default useRampsControllerInit;
