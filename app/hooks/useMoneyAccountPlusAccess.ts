import { useSelector } from 'react-redux';
import {
  selectHasAnyMoneyAccountPlusEntitlement,
  selectHasExistingMoneyAccountPlusSubscription,
} from '../selectors/subscriptionController';
import useSubscriptions from '../components/hooks/useSubscriptions';
import { useProSubscriptionEnabled } from './useProSubscriptionEnabled';

/**
 * Who may see which Money Account Plus surface.
 */
export enum MoneyAccountPlusAccess {
  /** A/B flag is off. No Pro UI anywhere, subscriber or not. */
  Disabled = 'disabled',
  /**
   * Holds a Plus subscription (active, trialing, provisional, or paused) or
   * a still-granted entitlement. May open Pro Hub and manage the membership.
   */
  Subscriber = 'subscriber',
  /** No existing Plus subscription. Show the upsell. */
  Eligible = 'eligible',
  /**
   * Subscriptions have not resolved yet, or the fetch failed. Empty
   * controller state must not be treated as Eligible, or a paid user is
   * bounced from subscriber surfaces.
   */
  Unknown = 'unknown',
}

/**
 * Resolves which Money Account Plus experience the current user may access.
 *
 * The `subSUB990AbtestProSubscriptionFlow` A/B flag gates every Pro surface,
 * so control-group users get {@link MoneyAccountPlusAccess.Disabled} even
 * when they hold an active subscription. Past that, access is driven by
 * whether an existing Plus subscription is in SubscriptionController state,
 * but only after the initial subscriptions query has succeeded.
 *
 * Existing covers `paused` alongside the active statuses: a paused
 * subscriber has lost benefits but still owns the subscription, and needs
 * Pro Hub to reach Membership and fix the payment problem or cancel.
 *
 * Entitlements are checked alongside subscription status: the server keeps
 * paid features on through recoverable states such as `past_due`, which the
 * subscription selector fails closed on. Either signal grants
 * {@link MoneyAccountPlusAccess.Subscriber} so a paying user is never shown
 * the upsell or bounced from the hub.
 *
 * @returns The access state for the current user.
 */
export function useMoneyAccountPlusAccess(): MoneyAccountPlusAccess {
  const { isProSubscriptionEnabled } = useProSubscriptionEnabled();
  const { isLoading, isError } = useSubscriptions({
    enabled: isProSubscriptionEnabled,
  });
  const hasExistingSubscription = useSelector(
    selectHasExistingMoneyAccountPlusSubscription,
  );
  const hasEntitlement = useSelector(selectHasAnyMoneyAccountPlusEntitlement);

  if (!isProSubscriptionEnabled) {
    return MoneyAccountPlusAccess.Disabled;
  }

  if (hasExistingSubscription || hasEntitlement) {
    return MoneyAccountPlusAccess.Subscriber;
  }

  if (isLoading || isError) {
    return MoneyAccountPlusAccess.Unknown;
  }

  return MoneyAccountPlusAccess.Eligible;
}
