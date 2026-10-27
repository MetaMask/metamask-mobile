import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  SUBSCRIPTION_STATUSES,
  type SubscriptionStatus,
} from '@metamask/subscription-controller';
import { useQuery } from '@tanstack/react-query';
import Engine from '../../../../core/Engine';
import { useNetworkTier } from '../../../../hooks/useNetworkTier';
import { selectIsSignedIn } from '../../../../selectors/identity';
import { selectIsUnlocked } from '../../../../selectors/keyringController';
import { selectMoneyAccountPlusSubscription } from '../../../../selectors/subscriptionController';
import { getHardwareTier } from '../../../../util/deviceCapability';
import { SUBSCRIPTIONS_QUERY_KEY } from '../../../hooks/useSubscriptions';
import {
  ProvisionalPaymentTransition,
  getProvisionalSubscriptionPollIntervalMs,
  resolveProvisionalPaymentTransition,
} from '../utils/proSubscriptionPaymentStatus';
import { useProSubscriptionPaymentToasts } from './useProSubscriptionPaymentToasts';

const UNSEEN_STATUS = Symbol('unseen-subscription-status');

/**
 * Watches a provisional Money Account Plus plan from anywhere in the app.
 *
 * The first observed status is recorded and not announced, so opening the
 * app onto an already active plan does not toast. A later change from
 * provisional to active or trialing shows the membership toast. A later
 * change to a failed or missing plan opens the payment-failed sheet.
 *
 * While the plan is provisional, subscriptions refresh faster than the
 * five-minute access poll. The interval follows the device and network
 * tiers in `getProvisionalSubscriptionPollIntervalMs`. No usable network
 * skips this extra poll. The query stays gated on sign-in and unlock, same
 * as `useSubscriptions`.
 *
 * @returns Whether the payment-failed sheet is open, and how to close it.
 */
export function useProSubscriptionPaymentMonitor(): {
  isPaymentFailedSheetOpen: boolean;
  closePaymentFailedSheet: () => void;
} {
  const subscription = useSelector(selectMoneyAccountPlusSubscription);
  const isSignedIn = useSelector(selectIsSignedIn);
  const isUnlocked = Boolean(useSelector(selectIsUnlocked));
  const { showActiveToast, dismissPaymentToast } =
    useProSubscriptionPaymentToasts();
  const [isPaymentFailedSheetOpen, setIsPaymentFailedSheetOpen] =
    useState(false);
  const hardwareTier = getHardwareTier();
  const networkTier = useNetworkTier();
  const status = subscription?.status;
  const isProvisional = status === SUBSCRIPTION_STATUSES.provisional;
  const pollInterval = getProvisionalSubscriptionPollIntervalMs(
    hardwareTier,
    networkTier,
  );
  const previousStatusRef = useRef<
    SubscriptionStatus | undefined | typeof UNSEEN_STATUS
  >(UNSEEN_STATUS);

  const closePaymentFailedSheet = useCallback(() => {
    setIsPaymentFailedSheetOpen(false);
  }, []);

  useQuery({
    queryKey: SUBSCRIPTIONS_QUERY_KEY,
    queryFn: () => Engine.context.SubscriptionController.getSubscriptions(),
    enabled:
      isProvisional && pollInterval !== false && isSignedIn && isUnlocked,
    refetchInterval: pollInterval === false ? false : pollInterval,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  useEffect(() => {
    const previousStatus = previousStatusRef.current;
    previousStatusRef.current = status;

    if (
      previousStatus === UNSEEN_STATUS ||
      previousStatus !== SUBSCRIPTION_STATUSES.provisional
    ) {
      return;
    }

    const transition = resolveProvisionalPaymentTransition(status);
    if (transition === ProvisionalPaymentTransition.Activated) {
      showActiveToast();
      return;
    }

    if (transition === ProvisionalPaymentTransition.Failed) {
      dismissPaymentToast();
      setIsPaymentFailedSheetOpen(true);
    }
  }, [dismissPaymentToast, showActiveToast, status]);

  return { isPaymentFailedSheetOpen, closePaymentFailedSheet };
}
