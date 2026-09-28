import { useSelector } from 'react-redux';
import { selectIsMoneyAccountPlusSubscriber } from '../selectors/subscriptionController';
import {
  PRO_DEMO_MODE,
  useProDemoSubscriber,
} from '../components/Views/shared/pro/proDemo';

/**
 * Returns whether the user currently has an active MetaMask Pro (Money Account
 * Plus) subscription, as reported by the SubscriptionController.
 *
 * Subscription state is only populated while something polls the controller —
 * see `useSubscriptionPolling`.
 */
export function useIsProSubscriber(): boolean {
  const isSubscriber = useSelector(selectIsMoneyAccountPlusSubscriber);
  // DEMO ONLY: the Benefits CTA flips this in memory so the Money header
  // shows `Pro` and opens Pro Hub without a real subscription.
  const isDemoSubscriber = useProDemoSubscriber();

  return isSubscriber || (PRO_DEMO_MODE && isDemoSubscriber);
}
