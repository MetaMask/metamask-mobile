import { useSelector } from 'react-redux';
import { selectIsMoneyAccountPlusSubscriber } from '../selectors/subscriptionController';

/**
 * Returns whether the user currently has an active MetaMask Pro (Money Account
 * Plus) subscription, as reported by the SubscriptionController.
 *
 * Subscription state is only populated while something polls the controller —
 * see `useSubscriptionPolling`.
 */
export function useIsProSubscriber(): boolean {
  return useSelector(selectIsMoneyAccountPlusSubscriber);
}
