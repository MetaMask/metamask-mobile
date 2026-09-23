import { useSelector } from 'react-redux';
import { selectIsMoneyAccountPlusSubscriber } from '../selectors/subscriptionController';
import useSubscriptionPolling from '../components/hooks/useSubscriptionPolling';
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
 * @returns The access state for the current user.
 */
export function useMoneyAccountPlusAccess(): MoneyAccountPlusAccess {
  const { isProSubscriptionEnabled } = useProSubscriptionEnabled();
  const { isLoading } = useSubscriptionPolling({
    enabled: isProSubscriptionEnabled,
  });
  const isSubscriber = useSelector(selectIsMoneyAccountPlusSubscriber);

  if (!isProSubscriptionEnabled) {
    return MoneyAccountPlusAccess.Disabled;
  }

  if (isSubscriber) {
    return MoneyAccountPlusAccess.Subscriber;
  }

  if (isLoading) {
    return MoneyAccountPlusAccess.Unknown;
  }

  return MoneyAccountPlusAccess.Eligible;
}
