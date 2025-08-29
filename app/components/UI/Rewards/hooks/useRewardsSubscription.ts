import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../../reducers';
import type { SubscriptionDto } from '../../../../core/Engine/controllers/rewards-controller/types';

export interface UseRewardsSubscriptionResult {
  /**
   * Current subscription data
   */
  subscription: SubscriptionDto | null;
}

/**
 * Custom hook to get current rewards subscription information
 * This hook provides access to the user's subscription data from the RewardsController
 */
export const useRewardsSubscription = (): UseRewardsSubscriptionResult => {
  const [subscription, setSubscription] = useState<SubscriptionDto | null>(
    null,
  );
  const rewardsState = useSelector(
    (state: RootState) => state.engine.backgroundState.RewardsController,
  );

  useEffect(() => {
    if (rewardsState) {
      const { subscription: currentSubscription } = rewardsState;

      setSubscription(currentSubscription);
    }
  }, [rewardsState]);

  return {
    subscription,
  };
};
