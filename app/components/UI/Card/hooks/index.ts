import { useCallback, useEffect } from 'react';
import { useCardSDK } from '../sdk/sdk';

/**
 * Hook to automatically check card holder status when address or card feature changes
 */
export const useCardHolderStatus = (autoFetch = false) => {
  const { isCardHolderStatus, checkCardHolderStatus, isLoadingCardHolder } =
    useCardSDK();

  useEffect(() => {
    if (autoFetch && isCardHolderStatus === null) {
      checkCardHolderStatus();
    }
  }, [autoFetch, isCardHolderStatus, checkCardHolderStatus]);

  return {
    isCardHolder: isCardHolderStatus,
    isLoading: isLoadingCardHolder,
    refetch: useCallback(
      () => checkCardHolderStatus(),
      [checkCardHolderStatus],
    ),
  };
};

/**
 * Hook to automatically fetch card token balances when address or card feature changes
 */
export const useCardTokenBalances = (autoFetch = false) => {
  const {
    tokenBalances,
    priorityToken,
    fetchBalances,
    isLoadingBalances,
    balancesError,
  } = useCardSDK();

  useEffect(() => {
    if (autoFetch) {
      fetchBalances();
    }
  }, [autoFetch, fetchBalances]);

  return {
    balances: tokenBalances,
    priorityToken,
    isLoading: isLoadingBalances,
    error: balancesError,
    refetch: useCallback(() => fetchBalances(), [fetchBalances]),
  };
};

/**
 * Hook to manage user geolocation
 */
export const useUserLocation = (autoFetch = false) => {
  const { userLocation, fetchUserLocation, isLoadingLocation } = useCardSDK();

  useEffect(() => {
    if (autoFetch && !userLocation) {
      fetchUserLocation();
    }
  }, [autoFetch, userLocation, fetchUserLocation]);

  return {
    location: userLocation,
    isLoading: isLoadingLocation,
    fetchLocation: fetchUserLocation,
  };
};
