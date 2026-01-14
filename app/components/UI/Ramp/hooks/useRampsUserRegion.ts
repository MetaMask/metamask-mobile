import { useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import {
  selectUserRegion,
  selectUserRegionRequest,
} from '../../../../selectors/rampsController';
import {
  ExecuteRequestOptions,
  RequestSelectorResult,
} from '@metamask/ramps-controller';

/**
 * Result returned by the useRampsUserRegion hook.
 */
export interface UseRampsUserRegionResult {
  /**
   * The user's region code (e.g., "US-CA"), or null if not loaded.
   */
  userRegion: string | null;
  /**
   * Whether the user region request is currently loading.
   */
  isLoading: boolean;
  /**
   * The error message if the request failed, or null.
   */
  error: string | null;
  /**
   * Manually fetch the user region from geolocation.
   */
  fetchUserRegion: (options?: ExecuteRequestOptions) => Promise<string>;
  /**
   * Set the user region manually (without fetching geolocation).
   */
  setUserRegion: (
    region: string,
    options?: ExecuteRequestOptions,
  ) => Promise<void>;
}

/**
 * Hook to get the user's region state from RampsController.
 * This hook assumes Engine is already initialized.
 *
 * @returns User region state and fetch/set functions.
 */
export function useRampsUserRegion(): UseRampsUserRegionResult {
  const userRegion = useSelector(selectUserRegion);
  const { isFetching, error } = useSelector(
    selectUserRegionRequest,
  ) as RequestSelectorResult<string>;

  const fetchUserRegion = useCallback(
    (options?: ExecuteRequestOptions) =>
      Engine.context.RampsController.updateUserRegion(options),
    [],
  );

  const setUserRegion = useCallback(
    async (region: string, options?: ExecuteRequestOptions) => {
      await Engine.context.RampsController.setUserRegion(region, options);
    },
    [],
  );

  useEffect(() => {
    fetchUserRegion().catch(() => {
      // Error is stored in state
    });
  }, [fetchUserRegion]);

  return {
    userRegion,
    isLoading: isFetching,
    error,
    fetchUserRegion,
    setUserRegion,
  };
}

export default useRampsUserRegion;
