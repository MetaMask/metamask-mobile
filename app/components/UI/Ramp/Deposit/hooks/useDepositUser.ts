import { useCallback, useEffect } from 'react';
import { useDepositSdkMethod } from './useDepositSdkMethod';
import { useDepositSDK } from '../sdk';
import type { AxiosError } from 'axios';
import Logger from '../../../../../util/Logger';
import useAnalytics from '../../hooks/useAnalytics';

export interface UseDepositUserConfig {
  screenLocation?: string;
  shouldTrackFetch?: boolean;
  fetchOnMount?: boolean;
}

export function useDepositUser(config?: UseDepositUserConfig) {
  const {
    screenLocation = '',
    shouldTrackFetch = false,
    fetchOnMount = false,
  } = config || {};
  const { isAuthenticated, logoutFromProvider, selectedRegion } =
    useDepositSDK();

  const [{ data: userDetails, error, isFetching }, fetchUserDetails] =
    useDepositSdkMethod({
      method: 'getUserDetails',
      onMount: false,
      throws: true,
    });

  const trackEvent = useAnalytics();

  const fetchUserDetailsCallback = useCallback(async () => {
    try {
      if (shouldTrackFetch) {
        trackEvent('RAMPS_USER_DETAILS_FETCHED', {
          logged_in: isAuthenticated,
          region:
            userDetails?.address?.countryCode || selectedRegion?.isoCode || '',
          location: screenLocation,
        });
      }
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
  }, [
    trackEvent,
    fetchUserDetails,
    logoutFromProvider,
    shouldTrackFetch,
    isAuthenticated,
    userDetails,
    selectedRegion,
    screenLocation,
  ]);

  useEffect(() => {
    if (
      fetchOnMount &&
      isAuthenticated &&
      !userDetails &&
      !isFetching &&
      !error
    ) {
      fetchUserDetailsCallback();
    }
  }, [
    isAuthenticated,
    userDetails,
    fetchUserDetailsCallback,
    isFetching,
    error,
    fetchOnMount,
  ]);

  return {
    userDetails: isAuthenticated ? userDetails : null,
    error,
    isFetching,
    fetchUserDetails: fetchUserDetailsCallback,
  };
}
