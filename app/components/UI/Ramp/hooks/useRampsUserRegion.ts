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
  userRegion: UserRegion | null;
  setUserRegion: (
    region: string,
    options?: ExecuteRequestOptions,
  ) => Promise<UserRegion | null>;
}

/**
 * Hook to get the user's region state from RampsController.
 * This hook assumes Engine is already initialized.
 */
export function useRampsUserRegion(): UseRampsUserRegionResult {
  const { data: userRegion } = useSelector(selectUserRegion);

  const setUserRegion = useCallback(
    (region: string, options?: ExecuteRequestOptions) =>
      Engine.context.RampsController.setUserRegion(region, options),
    [],
  );

  return {
    userRegion,
    setUserRegion,
  };
}

export default useRampsUserRegion;
