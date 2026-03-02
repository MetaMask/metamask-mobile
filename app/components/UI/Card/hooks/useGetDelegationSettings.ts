import { useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCardSDK } from '../sdk';
import { DelegationSettingsResponse } from '../types';
import { dashboardKeys } from '../queries';

const STALE_TIME = 10 * 60 * 1000; // 10 minutes

/**
 * Hook to fetch and cache delegation settings from the Card SDK.
 *
 * @returns Object containing delegation settings data, loading state, error, and fetch function
 */
const useGetDelegationSettings = () => {
  const { sdk } = useCardSDK();
  const queryClient = useQueryClient();
  const sdkRef = useRef(sdk);
  sdkRef.current = sdk;

  const queryKey = dashboardKeys.delegationSettings();

  const queryFn = () => {
    const currentSdk = sdkRef.current;
    if (!currentSdk) throw new Error('SDK not initialized');
    return currentSdk.getDelegationSettings();
  };

  const { data, isLoading, error } =
    useQuery<DelegationSettingsResponse | null>({
      queryKey,
      queryFn,
      enabled: false,
      staleTime: STALE_TIME,
    });

  const fetchData = useCallback(async () => {
    const result = await queryClient.fetchQuery({
      queryKey,
      queryFn,
      staleTime: STALE_TIME,
    });
    return result ?? null;
  }, [queryClient, queryKey]);

  return {
    data: data ?? null,
    isLoading,
    error: error as Error | null,
    fetchData,
  };
};

export default useGetDelegationSettings;
