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
   * Whether the user region request is currently loading.
   */
  isLoading: boolean;
  /**
   * The error message if the request failed, or null.
   */
  error: string | null;
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
  const userRegion = useSelector(selectUserRegion);
  const { isFetching, error } = useSelector(
    selectUserRegionRequest,
  ) as RequestSelectorResult<UserRegion | null>;

  const setUserRegion = useCallback(
    (region: string, options?: ExecuteRequestOptions) =>
      Engine.context.RampsController.setUserRegion(region, options),
    [],
  );


  return {
    userRegion,
    isLoading: isFetching,
    error,
    setUserRegion,
  };
}

export default useRampsUserRegion;
