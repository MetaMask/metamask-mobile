import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCardSDK } from '../sdk';
import { useSelector } from 'react-redux';
import { selectIsAuthenticatedCard } from '../../../../core/redux/slices/card';
import { DelegationSettingsResponse } from '../types';
import { cardKeys } from '../queries';

/**
 * Hook to fetch and cache delegation settings from the Card SDK.
 *
 * @returns Object containing delegation settings data, loading state, error, and fetch function
 */
const useGetDelegationSettings = () => {
  const { sdk } = useCardSDK();
  const isAuthenticated = useSelector(selectIsAuthenticatedCard);

  const { data, isLoading, error, refetch } =
    useQuery<DelegationSettingsResponse | null>({
      queryKey: cardKeys.delegationSettings(),
      queryFn: () => {
        if (!sdk) throw new Error('SDK not initialized');
        return sdk.getDelegationSettings();
      },
      enabled: isAuthenticated && !!sdk,
      staleTime: 10 * 60 * 1000, // 10 minutes
    });

  const fetchData = useCallback(async () => {
    const result = await refetch();
    return result.data ?? null;
  }, [refetch]);

  return {
    data: data ?? null,
    isLoading,
    error: error as Error | null,
    fetchData,
  };
};

export default useGetDelegationSettings;
