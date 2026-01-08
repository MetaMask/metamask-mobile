import { useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import {
  selectGeolocation,
  selectGeolocationRequest,
} from '../../../../selectors/rampsController';
import { ExecuteRequestOptions } from '@metamask/ramps-controller';

/**
 * Result returned by the useRampsGeolocation hook.
 */
export interface UseRampsGeolocationResult {
  /**
   * The user's geolocation country/region code (e.g., "US-CA"), or null if not loaded.
   */
  geolocation: string | null;
  /**
   * Whether the geolocation request is currently loading.
   */
  isLoading: boolean;
  /**
   *
   * The error message if the request failed, or null.
   */
  error: string | null;
  /**
   * Manually fetch the geolocation.
   */
  fetchGeolocation: (options?: ExecuteRequestOptions) => Promise<string>;
}

/**
 * Hook to get the user's geolocation state from RampsController.
 * This hook assumes Engine is already initialized.
 *
 * @returns Geolocation state and fetch function.
 *
 * @example
 * ```tsx
 * const { geolocation, isLoading, error, fetchGeolocation } = useRampsGeolocation();
 *
 * if (isLoading) return <Loading />;
 * if (error) return <Error message={error} />;
 * return <Text>Your location: {geolocation}</Text>;
 * ```
 */
export function useRampsGeolocation(): UseRampsGeolocationResult {
  const geolocation = useSelector(selectGeolocation);
  const { isFetching, error } = useSelector(selectGeolocationRequest);

  const fetchGeolocation = useCallback(
    (options?: ExecuteRequestOptions) =>
      Engine.context.RampsController.updateGeolocation(options),
    [],
  );

  useEffect(() => {
    fetchGeolocation().catch(() => {
      // Error is stored in state
    });
  }, [fetchGeolocation]);

  return {
    geolocation,
    isLoading: isFetching,
    error,
    fetchGeolocation,
  };
}

export default useRampsGeolocation;
