import { useEffect } from 'react';
import { useDepositSdkMethod } from './useDepositSdkMethod';
import { useDepositSDK } from '../sdk';

export function useDepositUser() {
  const { isAuthenticated } = useDepositSDK();
  const [{ data: userDetails, error, isFetching }, fetchUserDetails] =
    useDepositSdkMethod({
      method: 'getUserDetails',
      onMount: false,
    });

  useEffect(() => {
    if (isAuthenticated && !userDetails) {
      fetchUserDetails();
    }
  }, [isAuthenticated, userDetails, fetchUserDetails]);

  return {
    userDetails: isAuthenticated ? userDetails : null,
    error,
    isFetching,
    fetchUserDetails,
  };
}
