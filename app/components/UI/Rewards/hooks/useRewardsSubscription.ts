import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../../reducers';
import type { SubscriptionDto } from '../../../../core/Engine/controllers/rewards-controller/types';

export interface UseRewardsSubscriptionResult {
  /**
   * Current subscription data
   */
  subscription: SubscriptionDto | null;
  /**
   * Subscription ID for API calls
   */
  subscriptionId: string | null;
  /**
   * Whether user is authenticated for rewards
   */
  isAuthenticated: boolean;
  /**
   * Last authenticated account address
   */
  lastAuthenticatedAccount: string | null;
}

/**
 * Custom hook to get current rewards subscription information
 * This hook provides access to the user's subscription data from the RewardsController
 */
export const useRewardsSubscription = (): UseRewardsSubscriptionResult => {
  const [subscription, setSubscription] = useState<SubscriptionDto | null>(
    null,
  );
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [lastAuthenticatedAccount, setLastAuthenticatedAccount] = useState<
    string | null
  >(null);

  // Get subscription data from Redux store
  const rewardsState = useSelector(
    (state: RootState) => state.engine.backgroundState.RewardsController,
  );

  useEffect(() => {
    if (rewardsState) {
      const {
        subscription: currentSubscription,
        lastAuthenticatedAccount: lastAccount,
      } = rewardsState;

      setSubscription(currentSubscription);
      setSubscriptionId(currentSubscription?.id || null);
      setIsAuthenticated(!!currentSubscription);
      setLastAuthenticatedAccount(lastAccount);
    }
  }, [rewardsState]);

  return {
    subscription,
    subscriptionId,
    isAuthenticated,
    lastAuthenticatedAccount,
  };
};
