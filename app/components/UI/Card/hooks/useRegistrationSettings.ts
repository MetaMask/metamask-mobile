import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { useCardSDK } from '../sdk';
import { cardQueries } from '../queries';
import { selectCardUserLocation } from '../../../../selectors/cardController';
import type { CardLocation } from '../types';

const DEFAULT_CARD_LOCATION: CardLocation = 'international';

/**
 * Hook to fetch and cache registration settings from the Card SDK.
 *
 * @returns Object containing registration settings data, loading state, error, and fetch function
 */
const useRegistrationSettings = () => {
  const { sdk } = useCardSDK();
  const userCardLocation = useSelector(selectCardUserLocation);
  const effectiveLocation = userCardLocation ?? DEFAULT_CARD_LOCATION;

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey:
      cardQueries.dashboard.keys.registrationSettings(effectiveLocation),
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
    isLoading: isLoading && isFetching,
    error: error as Error | null,
    fetchData,
  };
};

export default useRegistrationSettings;
