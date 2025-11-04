import { useCallback, useEffect } from 'react';
import { useDepositSdkMethod } from './useDepositSdkMethod';
import { useDepositSDK } from '../sdk';
import type { AxiosError } from 'axios';
import Logger from '../../../../../util/Logger';

export function useDepositUser() {
  const { isAuthenticated, logoutFromProvider } = useDepositSDK();

  const [{ data: userDetails, error, isFetching }, fetchUserDetails] =
    useDepositSdkMethod({
      method: 'getUserDetails',
      onMount: false,
      throws: true,
    });

  const fetchUserDetailsCallback = useCallback(async () => {
    try {
      const result = await fetchUserDetails();
      return result;
    } catch (error) {
      if ((error as AxiosError).status === 401) {
        Logger.log('useDepositUser: 401 error, clearing authentication');
        await logoutFromProvider(false);
      } else {
        throw error;
      }
    }
  }, [fetchUserDetails, logoutFromProvider]);

  useEffect(() => {
    if (isAuthenticated && !userDetails && !isFetching && !error) {
      fetchUserDetailsCallback();
    }
  }, [
    isAuthenticated,
    userDetails,
    fetchUserDetailsCallback,
    isFetching,
    error,
  ]);

  return {
    userDetails: isAuthenticated ? userDetails : null,
    error,
    isFetching,
    fetchUserDetails: fetchUserDetailsCallback,
  };
}
