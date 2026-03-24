import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCardSDK } from '../sdk';
import { cardQueries } from '../queries';

/**
 * Hook to fetch and cache registration settings from the Card SDK.
 *
 * @returns Object containing registration settings data, loading state, error, and fetch function
 */
const useRegistrationSettings = () => {
  const { sdk } = useCardSDK();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: cardQueries.dashboard.keys.registrationSettings(),
    queryFn: () => {
      if (!sdk) throw new Error('SDK not initialized');
      return sdk.getRegistrationSettings();
    },
    enabled: !!sdk,
    staleTime: 5 * 60 * 1000,
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

export default useRegistrationSettings;
