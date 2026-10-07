import { useCallback, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectMoneyAccountPlusSubscription } from '../../../../selectors/subscriptionController';
import { ensureError } from '../../../../util/errorUtils';
import Logger from '../../../../util/Logger';
import { strings } from '../../../../../locales/i18n';
import { canResumeMembership } from '../ProHub.utils';

export interface UseResumeMembershipResult {
  resumeMembership: () => Promise<void>;
  isResuming: boolean;
  errorMessage: string | null;
  canResume: boolean;
}

/**
 * Reverses a pending Money Account Plus cancellation.
 *
 * Shared by Membership and any later Pro Hub entry point. The row stays
 * available only while `canResume` is true.
 *
 * @returns Resume callback, in-flight state, and a localized failure message.
 */
export function useResumeMembership(): UseResumeMembershipResult {
  const subscription = useSelector(selectMoneyAccountPlusSubscription);
  const canResume = canResumeMembership(subscription);
  const [isResuming, setIsResuming] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isResumingRef = useRef(false);

  const resumeMembership = useCallback(async () => {
    if (isResumingRef.current || !subscription) {
      return;
    }

    isResumingRef.current = true;
    setIsResuming(true);
    setErrorMessage(null);

    try {
      await Engine.context.SubscriptionController.unCancelSubscription({
        subscriptionId: subscription.id,
      });
    } catch (error) {
      Logger.error(
        ensureError(error, 'useResumeMembership.unCancelSubscription'),
        {
          tags: {
            feature: 'money_account_plus',
            operation: 'uncancel_subscription',
          },
        },
      );
      setErrorMessage(strings('pro_hub.membership.resume_failed'));
    } finally {
      isResumingRef.current = false;
      setIsResuming(false);
    }
  }, [subscription]);

  return { resumeMembership, isResuming, errorMessage, canResume };
}
