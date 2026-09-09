import { useEffect, useRef, useSyncExternalStore } from 'react';
import { useSelector } from 'react-redux';
import {
  ensureResolved,
  getSnapshot,
  refresh,
  reset,
  subscribe,
} from '../core/Subscription/entitlementResolution';
import { selectSelectedInternalAccountId } from '../selectors/accountsController';
import { selectIsSignedIn } from '../selectors/identity';
import { selectIsUnlocked } from '../selectors/keyringController';
import {
  selectHasAnyMoneyAccountPlusEntitlement,
  selectIsMoneyAccountPlusSubscriber,
} from '../selectors/subscriptionController';
import { useProSubscriptionEnabled } from './useProSubscriptionEnabled';

/**
 * Who may see which Money Account Plus surface.
 */
export enum MoneyAccountPlusAccess {
  /** A/B flag is off. No Pro UI anywhere, subscriber or not. */
  Disabled = 'disabled',
  /** Entitlements are not resolved yet. Render no Pro UI, so nothing flashes. */
  Loading = 'loading',
  /** Active subscriber, or one retaining entitlements through a grace period. */
  Subscriber = 'subscriber',
  /** Resolved with no Plus entitlement. Show the upsell. */
  Eligible = 'eligible',
}

/**
 * Resolves which Money Account Plus experience the current user may access.
 *
 * The `subSUB990AbtestProSubscriptionFlow` A/B flag gates every Pro surface,
 * so control-group users get {@link MoneyAccountPlusAccess.Disabled} even
 * when they hold an active subscription. Past that, access is driven by
 * `SubscriptionController` entitlements rather than by
 * `subscription.products`, so a `past_due` subscriber keeps Pro access while
 * their entitlements are retained and an expired one loses it.
 *
 * @returns The access state for the current user.
 */
export function useMoneyAccountPlusAccess(): MoneyAccountPlusAccess {
  const { isProSubscriptionEnabled } = useProSubscriptionEnabled();
  const isSignedIn = useSelector(selectIsSignedIn);
  const isUnlocked = Boolean(useSelector(selectIsUnlocked));
  const selectedAccountId = useSelector(selectSelectedInternalAccountId);
  const isSubscriber = useSelector(selectIsMoneyAccountPlusSubscriber);
  const hasEntitlement = useSelector(selectHasAnyMoneyAccountPlusEntitlement);
  const resolutionStatus = useSyncExternalStore(subscribe, getSnapshot);

  const canResolve = isProSubscriptionEnabled && isSignedIn && isUnlocked;
  const previousAccountIdRef = useRef(selectedAccountId);

  // Entitlements are per-user, so a locked or signed-out session must not
  // leave a resolved status behind for whoever signs in next.
  useEffect(() => {
    if (!isSignedIn || !isUnlocked) {
      reset();
    }
  }, [isSignedIn, isUnlocked]);

  useEffect(() => {
    if (!canResolve) {
      return;
    }

    const previousAccountId = previousAccountIdRef.current;
    previousAccountIdRef.current = selectedAccountId;

    if (previousAccountId !== selectedAccountId) {
      refresh().catch(() => {
        // Status is already recorded as `error` by the store.
      });
      return;
    }

    ensureResolved().catch(() => {
      // Status is already recorded as `error` by the store.
    });
  }, [canResolve, selectedAccountId]);

  if (!isProSubscriptionEnabled) {
    return MoneyAccountPlusAccess.Disabled;
  }

  // Entitlements can only be resolved for a signed-in, unlocked user, so
  // everyone else is treated as an eligible non-subscriber rather than being
  // held on a spinner that would never clear.
  if (
    canResolve &&
    (resolutionStatus === 'idle' || resolutionStatus === 'loading')
  ) {
    return MoneyAccountPlusAccess.Loading;
  }

  // A failed fetch falls through to the upsell so we never grant paid UI
  // against unknown state.
  return isSubscriber || hasEntitlement
    ? MoneyAccountPlusAccess.Subscriber
    : MoneyAccountPlusAccess.Eligible;
}
