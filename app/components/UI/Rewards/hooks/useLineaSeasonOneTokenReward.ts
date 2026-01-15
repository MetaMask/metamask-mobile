import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import Engine from '../../../../core/Engine';
import type { LineaTokenRewardDto } from '../../../../core/Engine/controllers/rewards-controller/types';

export interface UseLineaSeasonOneTokenRewardResult {
  /**
   * The Linea token reward data
   */
  lineaTokenReward: LineaTokenRewardDto | null;

  /**
   * Loading state for fetching Linea token reward
   */
  isLoading: boolean;

  /**
   * Error state for fetching Linea token reward
   */
  error: boolean;

  /**
   * Function to refetch the Linea token reward
   */
  refetch: () => Promise<void>;
}

/**
 * Custom hook to fetch Season 1 Linea token reward for the current subscription
 */
export const useLineaSeasonOneTokenReward =
  (): UseLineaSeasonOneTokenRewardResult => {
    const subscriptionId = useSelector(selectRewardsSubscriptionId);
    const [lineaTokenReward, setLineaTokenReward] =
      useState<LineaTokenRewardDto | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<boolean>(false);

    const fetchLineaTokenReward = useCallback(async (): Promise<void> => {
      if (!subscriptionId) {
        setLineaTokenReward(null);
        setIsLoading(false);
        setError(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(false);

        const result = await Engine.controllerMessenger.call(
          'RewardsController:getSeasonOneLineaRewardTokens',
          subscriptionId,
        );

        setLineaTokenReward(result);
      } catch {
        setError(true);
        console.error('Error fetching Linea token reward');
      } finally {
        setIsLoading(false);
      }
    }, [subscriptionId]);

    useEffect(() => {
      fetchLineaTokenReward();
    }, [fetchLineaTokenReward]);

    return {
      lineaTokenReward,
      isLoading,
      error,
      refetch: fetchLineaTokenReward,
    };
  };

export default useLineaSeasonOneTokenReward;
