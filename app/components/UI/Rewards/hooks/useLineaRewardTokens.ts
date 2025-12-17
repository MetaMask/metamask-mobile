import { useCallback, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import Engine from '../../../../core/Engine';
import type { LineaTokenRewardDto } from '../../../../core/Engine/controllers/rewards-controller/types';
import { useFocusEffect } from '@react-navigation/native';

interface UseLineaRewardTokensReturn {
  lineaRewardTokens: LineaTokenRewardDto | null;
  isLoading: boolean;
  isError: boolean;
  refetch: () => Promise<void>;
}

/**
 * Custom hook to fetch and manage LINEA token rewards balance from the rewards API.
 * Uses the RewardsController to get the token balance for the current subscription.
 */
export const useLineaRewardTokens = (): UseLineaRewardTokensReturn => {
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const [lineaRewardTokens, setLineaRewardTokens] =
    useState<LineaTokenRewardDto | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const isLoadingRef = useRef(false);

  const fetchLineaRewardTokens = useCallback(async (): Promise<void> => {
    // Don't fetch if no subscriptionId
    if (!subscriptionId) {
      setLineaRewardTokens(null);
      setIsLoading(false);
      setIsError(false);
      return;
    }

    // Skip fetch if already loading (prevents duplicate requests)
    if (isLoadingRef.current) {
      return;
    }

    try {
      isLoadingRef.current = true;
      setIsLoading(true);
      setIsError(false);

      const fetchedTokens = await Engine.controllerMessenger.call(
        'RewardsController:getLineaRewardTokens',
        subscriptionId,
      );

      setLineaRewardTokens(fetchedTokens);
    } catch {
      // Keep existing data on error to prevent UI flash
      setIsError(true);
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }, [subscriptionId]);

  // Initial fetch and refetch on focus
  useFocusEffect(
    useCallback(() => {
      fetchLineaRewardTokens();
    }, [fetchLineaRewardTokens]),
  );

  return {
    lineaRewardTokens,
    isLoading,
    isError,
    refetch: fetchLineaRewardTokens,
  };
};

export default useLineaRewardTokens;
