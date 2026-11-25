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
  /** Pro subscription flag is off. No Pro UI anywhere, subscriber or not. */
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

export interface MoneyAccountPlusAccessState {
  access: MoneyAccountPlusAccess;
  /**
   * True once the subscriptions query has completed and no refetch is in
   * flight, including the refetch this hook starts on a stale remount.
   */
  isSubscriptionsSettled: boolean;
}

/**
 * Resolves Money Account Plus access together with the subscriptions query
 * state that produced it.
 *
 * The `subscription-money-account-orange-enabled` flag gates every Pro surface,
 * so users with the flag off get {@link MoneyAccountPlusAccess.Disabled} even
 * when they hold an active subscription. Past that, access is driven by
 * whether an existing Plus subscription is in SubscriptionController state.
 * An empty result stays unknown until that query has settled, including
 * while a refetch is in flight. React Query 5 reports `isLoading` only when
 * there is no data yet, so a refetch is not a finished non-member.
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
 * @returns The access state and whether the subscriptions query has settled.
 */
export function useMoneyAccountPlusAccessState(): MoneyAccountPlusAccessState {
  const { isProSubscriptionEnabled } = useProSubscriptionEnabled();
  const { isLoading, isError, isFetched, isFetching } = useSubscriptions({
    enabled: isProSubscriptionEnabled,
  });
  const hasExistingSubscription = useSelector(
    selectHasExistingMoneyAccountPlusSubscription,
  );
  const hasEntitlement = useSelector(selectHasAnyMoneyAccountPlusEntitlement);
  const isSubscriptionsSettled = isFetched && !isFetching;

  if (!isProSubscriptionEnabled) {
    return { access: MoneyAccountPlusAccess.Disabled, isSubscriptionsSettled };
  }

  if (hasExistingSubscription || hasEntitlement) {
    return {
      access: MoneyAccountPlusAccess.Subscriber,
      isSubscriptionsSettled,
    };
  }

  if (isLoading || isError || !isSubscriptionsSettled) {
    return { access: MoneyAccountPlusAccess.Unknown, isSubscriptionsSettled };
  }

  return { access: MoneyAccountPlusAccess.Eligible, isSubscriptionsSettled };
}

/**
 * Where a MetaMask Orange entry point should send the user.
 */
export enum MoneyAccountPlusEntry {
  /** Pro flag is off. No Orange surface. */
  Disabled = 'disabled',
  /** A stored Plus status Pro Hub can show. Opens Pro Hub. */
  Hub = 'hub',
  /** A settled non-member, including a leftover entitlement. Opens Benefits. */
  Join = 'join',
  /** Membership is not known yet. Neither label nor destination is safe. */
  Pending = 'pending',
}

/**
 * Single routing rule for the Orange row, Pro Hub, and the subscription
 * screen.
 *
 * Pro Hub renders only a stored membership, so an entitlement on its own is
 * Join, not Hub. Join waits for the subscriptions query to settle, because a
 * refetch keeps the previous empty result while a membership may still
 * arrive.
 *
 * @param params - Inputs to resolve.
 * @param params.access - Resolved Plus access.
 * @param params.hasMembership - Whether a Plus status Pro Hub can show is stored.
 * @param params.isSubscriptionsSettled - Whether the subscriptions query has settled.
 * @returns The entry point destination.
 */
export function resolveMoneyAccountPlusEntry({
  access,
  hasMembership,
  isSubscriptionsSettled,
}: {
  access: MoneyAccountPlusAccess;
  hasMembership: boolean;
  isSubscriptionsSettled: boolean;
}): MoneyAccountPlusEntry {
  if (access === MoneyAccountPlusAccess.Disabled) {
    return MoneyAccountPlusEntry.Disabled;
  }
  if (hasMembership) {
    return MoneyAccountPlusEntry.Hub;
  }
  if (
    isSubscriptionsSettled &&
    (access === MoneyAccountPlusAccess.Eligible ||
      access === MoneyAccountPlusAccess.Subscriber)
  ) {
    return MoneyAccountPlusEntry.Join;
  }
  return MoneyAccountPlusEntry.Pending;
}

/**
 * Resolves which Money Account Plus experience the current user may access.
 *
 * @returns The access state for the current user.
 */
export function useMoneyAccountPlusAccess(): MoneyAccountPlusAccess {
  return useMoneyAccountPlusAccessState().access;
}
