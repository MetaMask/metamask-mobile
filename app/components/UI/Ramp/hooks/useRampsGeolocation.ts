import {
  useRampsControllerRequest,
  type UseRampsControllerRequestOptions,
} from './useRampsControllerRequest';

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
   * The error message if the request failed, or null.
   */
  error: string | null;
}

/**
 * Hook to get the user's geolocation from RampsController.
 *
 * @param options - Hook options.
 * @returns Geolocation state.
 *
 * @example
 * ```tsx
 * const { geolocation, isLoading, error } = useRampsGeolocation();
 *
 * if (isLoading) return <Loading />;
 * if (error) return <Error message={error} />;
 * return <Text>Your location: {geolocation}</Text>;
 * ```
 */
export function useRampsGeolocation(
  options: UseRampsControllerRequestOptions = {},
): UseRampsGeolocationResult {
  const { data, error, status } = useRampsControllerRequest<string>(
    'updateGeolocation',
    [],
    options,
  );

  return {
    geolocation: data,
    isLoading: status === 'loading',
    error,
  };
}

export default useRampsGeolocation;
