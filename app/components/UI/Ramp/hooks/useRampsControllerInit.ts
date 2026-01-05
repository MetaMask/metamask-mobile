import { useEffect, useRef } from 'react';
import useRampsGeolocation from './useRampsGeolocation';

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
export function useRampsControllerInit(): void {
  const hasInitializedRef = useRef(false);
  const { fetchGeolocation } = useRampsGeolocation();

  useEffect(() => {
    if (hasInitializedRef.current) {
      return;
    }
    hasInitializedRef.current = true;

    fetchGeolocation();
  }, [fetchGeolocation]);
}

export default useRampsControllerInit;
