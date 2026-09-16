import { useSelector } from 'react-redux';
import {
  selectHasAnyMoneyAccountPlusEntitlement,
  selectIsMoneyAccountPlusSubscriber,
} from '../selectors/subscriptionController';
import { useResolveMoneyAccountPlusEntitlements } from './useResolveMoneyAccountPlusEntitlements';

/**
 * Returns whether the user currently has MetaMask Pro (Money Account Plus)
 * access, as reported by the SubscriptionController.
 *
 * True for an active subscriber (`active`, `trialing`, `provisional`) and for
 * a user who still holds at least one Plus entitlement (grace / `past_due`).
 *
 * Mounting this hook also resolves entitlements for the session — see
 * {@link useResolveMoneyAccountPlusEntitlements}.
 */
export function useIsProSubscriber(): boolean {
  useResolveMoneyAccountPlusEntitlements();

  const isSubscriber = useSelector(selectIsMoneyAccountPlusSubscriber);
  const hasEntitlement = useSelector(selectHasAnyMoneyAccountPlusEntitlement);

  return isSubscriber || hasEntitlement;
}
