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
    });

  const [, fetchUserDetailsThrowable] = useDepositSdkMethod({
    method: 'getUserDetails',
    onMount: false,
    throws: true,
  });

  useEffect(() => {
    if (isAuthenticated && !userDetails && !isFetching && !error) {
      fetchUserDetails();
    }
  }, [isAuthenticated, userDetails, fetchUserDetails, isFetching, error]);

  const fetchUserDetailsCallback = useCallback(async () => {
    try {
      const result = await fetchUserDetailsThrowable();
      return result;
    } catch (error) {
      if ((error as AxiosError).status === 401) {
        Logger.log(
          'useDepositUser: 401 error detected in throwable fetch, clearing authentication',
        );
        await logoutFromProvider(false);
      }
      throw error;
    }
  }, [fetchUserDetailsThrowable, logoutFromProvider]);

  return {
    userDetails: isAuthenticated ? userDetails : null,
    error,
    isFetching,
    fetchUserDetails: fetchUserDetailsCallback,
  };
}
