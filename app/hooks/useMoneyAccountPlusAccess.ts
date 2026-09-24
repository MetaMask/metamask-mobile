import { useSelector } from 'react-redux';
import {
  selectHasAnyMoneyAccountPlusEntitlement,
  selectIsMoneyAccountPlusSubscriber,
} from '../selectors/subscriptionController';
import useSubscriptions from '../components/hooks/useSubscriptions';
import { useProSubscriptionEnabled } from './useProSubscriptionEnabled';

/**
 * Who may see which Money Account Plus surface.
 */
export enum MoneyAccountPlusAccess {
  /** A/B flag is off. No Pro UI anywhere, subscriber or not. */
  Disabled = 'disabled',
  /** Active subscriber according to SubscriptionController. */
  Subscriber = 'subscriber',
  /** No active Plus subscription. Show the upsell. */
  Eligible = 'eligible',
  /**
   * Subscriptions have not resolved yet. Empty controller state must not be
   * treated as Eligible, or a paid user is bounced from subscriber surfaces.
   */
  Unknown = 'unknown',
}

/**
 * Resolves which Money Account Plus experience the current user may access.
 *
 * The `subSUB990AbtestProSubscriptionFlow` A/B flag gates every Pro surface,
 * so control-group users get {@link MoneyAccountPlusAccess.Disabled} even
 * when they hold an active subscription. Past that, access is driven by
 * SubscriptionController's active-subscriber selector, but only after the
 * initial subscriptions query has settled.
 *
 * Entitlements are checked alongside subscription status: the server keeps
 * paid features on through recoverable states such as `past_due`, which the
 * active-subscriber selector fails closed on. Either signal grants
 * {@link MoneyAccountPlusAccess.Subscriber} so a paying user is never shown
 * the upsell or bounced from the hub.
 *
 * @returns The access state for the current user.
 */
export function useMoneyAccountPlusAccess(): MoneyAccountPlusAccess {
  const { isProSubscriptionEnabled } = useProSubscriptionEnabled();
  const { isLoading } = useSubscriptions({
    enabled: isProSubscriptionEnabled,
  });
  const isSubscriber = useSelector(selectIsMoneyAccountPlusSubscriber);
  const hasEntitlement = useSelector(selectHasAnyMoneyAccountPlusEntitlement);

  if (!isProSubscriptionEnabled) {
    return MoneyAccountPlusAccess.Disabled;
  }

  if (isSubscriber || hasEntitlement) {
    return MoneyAccountPlusAccess.Subscriber;
  }

  if (isLoading) {
    return MoneyAccountPlusAccess.Unknown;
  }

  return MoneyAccountPlusAccess.Eligible;
}
