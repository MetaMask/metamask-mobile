import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectGeolocation } from '../../../../selectors/rampsController';
import {
  useRampsControllerRequest,
  type UseRampsControllerRequestOptions,
} from './useRampsControllerRequest';
import type { ExecuteRequestOptions } from '@metamask/ramps-controller';

/**
 * Result returned by the useRampsGeolocation hook.
 */
export interface UseRampsGeolocationResult {
  /**
   * The user's geolocation country/region code (e.g., "US-UT" for Utah, USA).
   * This is the legacy geolocation field that remains in sync for backwards compatibility.
   */
  geolocation: string | null;
  /**
   * Whether the geolocation request is currently loading.
   */
  isLoading: boolean;
  /**
   * The error message if the geolocation request failed, or null.
   */
  error: string | null;
  /**
   * Whether the geolocation request completed successfully.
   */
  isSuccess: boolean;
  /**
   * Whether the geolocation request failed.
   */
  isError: boolean;
  /**
   * Function to refresh the geolocation.
   */
  refresh: (options?: ExecuteRequestOptions) => Promise<string>;
  /**
   * Function to abort the geolocation request if it's in progress.
   */
  abort: () => boolean;
  /**
   * Function to invalidate the cached geolocation.
   */
  invalidate: () => void;
}

/**
 * Hook to get and manage the user's geolocation from RampsController.
 *
 * This hook uses the request caching system to:
 * - Cache the geolocation result
 * - Deduplicate concurrent requests
 * - Provide loading and error states
 * - Support abort and cache invalidation
 *
 * @param options - Hook options.
 * @returns Geolocation state and control functions.
 *
 * @example
 * ```tsx
 * const {
 *   geolocation,
 *   isLoading,
 *   error,
 *   refresh,
 * } = useRampsGeolocation();
 *
 * // Display the geolocation
 * <Text>Your location: {geolocation}</Text>
 *
 * // Manually refresh
 * <Button onPress={() => refresh({ forceRefresh: true })} title="Refresh" />
 * ```
 */
export function useRampsGeolocation(
  options: UseRampsControllerRequestOptions = {},
): UseRampsGeolocationResult {
  const {
    data,
    isLoading,
    error,
    isSuccess,
    isError,
    execute,
    abort,
    invalidate,
  } = useRampsControllerRequest<string>('updateGeolocation', [], options);

  // Also get the legacy geolocation field for backwards compatibility
  const geolocation = useSelector(selectGeolocation);

  const refresh = useCallback(
    async (refreshOptions?: ExecuteRequestOptions): Promise<string> => execute(refreshOptions),
    [execute],
  );

  return {
    // Prefer the request cache data, fall back to legacy field
    geolocation: data ?? geolocation,
    isLoading,
    error,
    isSuccess,
    isError,
    refresh,
    abort,
    invalidate,
  };
}

/**
 * Hook to update the geolocation imperatively.
 *
 * This is useful when you need to update geolocation without using the full hook.
 * For most cases, use `useRampsGeolocation` instead.
 *
 * @returns A function to update geolocation.
 */
export function useUpdateGeolocation() {
  return useCallback(
    async (options?: ExecuteRequestOptions): Promise<string> => {
      const { RampsController } = Engine.context;
      if (!RampsController) {
        throw new Error('RampsController is not available');
      }
      return RampsController.updateGeolocation(options);
    },
    [],
  );
}

export default useRampsGeolocation;
