import { useCallback } from 'react';
import { useDepositSDK } from '../sdk';

export interface UseDepositUserConfig {
  screenLocation?: string;
  shouldTrackFetch?: boolean;
}

export function useDepositUser(_config?: UseDepositUserConfig) {
  // Config is kept for backward compatibility but not used anymore
  // Analytics tracking now happens in SDK context
  const {
    isAuthenticated,
    userDetails,
    userDetailsError,
    isFetchingUserDetails,
    fetchUserDetails: sdkFetchUserDetails,
  } = useDepositSDK();

  const fetchUserDetailsCallback = useCallback(async () => {
    return sdkFetchUserDetails();
  }, [sdkFetchUserDetails]);

  return {
    userDetails: isAuthenticated ? userDetails : null,
    error: userDetailsError,
    isFetching: isFetchingUserDetails,
    fetchUserDetails: fetchUserDetailsCallback,
  };
}
