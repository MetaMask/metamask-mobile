import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
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
  clearActivationToastDebt,
  getActivationToastOwed,
  subscribeActivationToastDebt,
} from '../utils/activationToastDebt';
import {
  ProvisionalPaymentTransition,
  getProvisionalSubscriptionPollIntervalMs,
  isStillFundingSubscriptionStatus,
  resolveProvisionalPaymentTransition,
} from '../utils/proSubscriptionPaymentStatus';
import { useProSubscriptionPaymentToasts } from './useProSubscriptionPaymentToasts';

const UNSEEN_STATUS = Symbol('unseen-subscription-status');

/**
 * Watches an in-flight Money Account Plus payment from anywhere in the app.
 *
 * The first observed status is recorded and not announced, so opening the
 * app onto an already active or awaiting-funds plan does not toast.
 * Awaiting-funds on its own is an existing membership with a low balance.
 * A later change from provisional, or from awaiting-funds after this
 * session saw provisional, to active or trialing shows the membership
 * toast. Showing the processing toaster also owes that toast once, including
 * when Redux is already active before this effect records provisional. A
 * later change out of provisional, or out of awaiting-funds after this
 * session saw provisional, opens the payment-failed sheet. A plan that was
 * already canceled when the processing toaster was shown is not that
 * checkout.
 * A hop between those two funding statuses stays quiet and keeps watching.
 *
 * While that checkout is still funding, subscriptions refresh faster than
 * the five-minute access poll. The interval follows the device and network
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
  const [sawProvisionalCheckout, setSawProvisionalCheckout] = useState(false);
  const hardwareTier = getHardwareTier();
  const networkTier = useNetworkTier();
  const status = subscription?.status;
  const isProvisional = status === SUBSCRIPTION_STATUSES.provisional;
  const isCheckoutInFlight =
    isProvisional ||
    (status === SUBSCRIPTION_STATUSES.awaitingFunds && sawProvisionalCheckout);
  const pollInterval = getProvisionalSubscriptionPollIntervalMs(
    hardwareTier,
    networkTier,
  );
  const activationToastOwed = useSyncExternalStore(
    subscribeActivationToastDebt,
    getActivationToastOwed,
    getActivationToastOwed,
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
      isCheckoutInFlight && pollInterval !== false && isSignedIn && isUnlocked,
    refetchInterval: pollInterval === false ? false : pollInterval,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  useEffect(() => {
    const previousStatus = previousStatusRef.current;
    previousStatusRef.current = status;

    if (isProvisional) {
      setSawProvisionalCheckout(true);
    } else if (
      !isStillFundingSubscriptionStatus(status) &&
      sawProvisionalCheckout
    ) {
      setSawProvisionalCheckout(false);
    }

    const observedThisCheckout =
      previousStatus !== UNSEEN_STATUS &&
      (previousStatus === SUBSCRIPTION_STATUSES.provisional ||
        (previousStatus === SUBSCRIPTION_STATUSES.awaitingFunds &&
          sawProvisionalCheckout));
    const transition = resolveProvisionalPaymentTransition(status);
    const owesThisCheckout = observedThisCheckout || activationToastOwed;

    if (
      transition === ProvisionalPaymentTransition.Activated &&
      owesThisCheckout
    ) {
      clearActivationToastDebt();
      showActiveToast();
      return;
    }

    if (
      transition === ProvisionalPaymentTransition.Failed &&
      observedThisCheckout
    ) {
      clearActivationToastDebt();
      dismissPaymentToast();
      setIsPaymentFailedSheetOpen(true);
    }
  }, [
    activationToastOwed,
    dismissPaymentToast,
    isProvisional,
    sawProvisionalCheckout,
    showActiveToast,
    status,
  ]);

  return { isPaymentFailedSheetOpen, closePaymentFailedSheet };
}
