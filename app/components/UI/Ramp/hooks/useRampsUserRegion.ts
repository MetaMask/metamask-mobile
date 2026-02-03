import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectUserRegion } from '../../../../selectors/rampsController';
import {
  ExecuteRequestOptions,
  type UserRegion,
} from '@metamask/ramps-controller';

/**
 * Result returned by the useRampsUserRegion hook.
 */
export interface UseRampsUserRegionResult {
  /**
   * The user's region object with country, state, and regionCode, or null if not loaded.
   */
  userRegion: UserRegion | null;
  /**
   * Whether the user region is currently loading.
   */
  isLoading: boolean;
  /**
   * Error message if user region fetch failed.
   */
  error: string | null;
  /**
   * Manually fetch the user region from geolocation.
   */
  fetchUserRegion: (options?: ExecuteRequestOptions) => Promise<void>;
  /**
   * Set the user region manually (without fetching geolocation).
   */
  setUserRegion: (
    region: string,
    options?: ExecuteRequestOptions,
  ) => Promise<UserRegion | null>;
}

/**
 * Hook to get the user's region state from RampsController.
 * This hook assumes Engine is already initialized.
 *
 * @returns User region state and fetch/set functions.
 */
export function useRampsUserRegion(): UseRampsUserRegionResult {
  const { data: userRegion, isLoading, error } = useSelector(selectUserRegion);

  const fetchUserRegion = useCallback(
    async (options?: ExecuteRequestOptions) =>
      await Engine.context.RampsController.init(options),
    [],
  );

  const setUserRegion = useCallback(
    (region: string, options?: ExecuteRequestOptions) =>
      Engine.context.RampsController.setUserRegion(region, options),
    [],
  );

  return {
    userRegion,
    isLoading,
    error,
    fetchUserRegion,
    setUserRegion,
  };
}

export default useRampsUserRegion;
