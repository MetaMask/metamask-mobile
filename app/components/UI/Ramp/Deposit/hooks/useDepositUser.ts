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
      const result = await fetchUserDetails();
      if (shouldTrackFetch) {
        trackEvent('RAMPS_USER_DETAILS_FETCHED', {
          logged_in: true,
          region: result?.address?.countryCode || selectedRegion?.isoCode || '',
          location: screenLocation,
        });
      }
      return result;
    } catch (error) {
      if ((error as AxiosError).status === 401) {
        if (shouldTrackFetch) {
          trackEvent('RAMPS_USER_DETAILS_FETCHED', {
            logged_in: false,
            region: selectedRegion?.isoCode || '',
            location: screenLocation,
          });
        }
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
