import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  ensureResolved,
  reset,
} from '../core/Subscription/entitlementResolution';
import { selectSelectedInternalAccountId } from '../selectors/accountsController';
import { selectIsSignedIn } from '../selectors/identity';
import { selectIsUnlocked } from '../selectors/keyringController';
import { useProSubscriptionEnabled } from './useProSubscriptionEnabled';

/**
 * Resolves Money Account Plus entitlements for the current session.
 *
 * Mounted from `useMoneyAccountPlusAccess` (and thus from Money via
 * `useIsProSubscriber`) so the header CTA and Pro screens resolve
 * entitlements without those screens having to be open.
 */
export function useResolveMoneyAccountPlusEntitlements(): void {
  const { isProSubscriptionEnabled } = useProSubscriptionEnabled();
  const isSignedIn = useSelector(selectIsSignedIn);
  const isUnlocked = Boolean(useSelector(selectIsUnlocked));
  const selectedAccountId = useSelector(selectSelectedInternalAccountId);

  const canResolve = isProSubscriptionEnabled && isSignedIn && isUnlocked;

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

    ensureResolved(selectedAccountId).catch(() => {
      // Status is already recorded as `error` by the store.
    });
  }, [canResolve, selectedAccountId]);
}
