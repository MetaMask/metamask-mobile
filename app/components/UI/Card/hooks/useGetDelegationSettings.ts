import { useCallback } from 'react';
import { useCardSDK } from '../sdk';
import { useWrapWithCache } from './useWrapWithCache';
import { useSelector } from 'react-redux';
import { selectIsAuthenticatedCard } from '../../../../core/redux/slices/card';

/**
 * Hook to fetch and cache delegation settings from the Card SDK
 *
 * @returns Object containing delegation settings data, loading state, error, and fetch function
 */
const useGetDelegationSettings = () => {
  const { sdk } = useCardSDK();
  const isAuthenticated = useSelector(selectIsAuthenticatedCard);

  const fetchDelegationSettings = useCallback(async () => {
    if (!sdk || !isAuthenticated) {
      return null;
    }
    return sdk.getDelegationSettings();
  }, [sdk, isAuthenticated]);

  return useWrapWithCache('delegation-settings', fetchDelegationSettings, {
    cacheDuration: 10 * 60 * 1000, // 10 minutes cache
    fetchOnMount: false, // Disabled - fetchAllData orchestrates fetching
  });
};

export default useGetDelegationSettings;
