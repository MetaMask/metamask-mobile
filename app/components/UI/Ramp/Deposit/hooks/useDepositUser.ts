import { useCallback } from 'react';
import { FetchUserDetailsParams, useDepositSDK } from '../sdk';

export interface UseDepositUserConfig {
  screenLocation?: string;
  shouldTrackFetch?: boolean;
}

export function useDepositUser(_config?: UseDepositUserConfig) {
  const {
    isAuthenticated,
    userDetails,
    userDetailsError,
    isFetchingUserDetails,
    fetchUserDetails: sdkFetchUserDetails,
  } = useDepositSDK();

  const fetchUserDetailsCallback = useCallback(
    async (params: FetchUserDetailsParams) => sdkFetchUserDetails(params),
    [sdkFetchUserDetails],
  );

  return {
    userDetails: isAuthenticated ? userDetails : null,
    error: userDetailsError,
    isFetching: isFetchingUserDetails,
    fetchUserDetails: fetchUserDetailsCallback,
  };
}
