import { useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectSelectedInternalAccount } from '../../../../selectors/accountsController';
import { handleRewardsErrorMessage } from '../utils';
import Engine from '../../../../core/Engine';
import { setCandidateSubscriptionId } from '../../../../reducers/rewards';
import { MetaMetricsEvents, useMetrics } from '../../../hooks/useMetrics';
import { UserProfileProperty } from '../../../../util/metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';

export interface UseOptinResult {
  /**
   * Function to initiate the optin process
   */
  optin: ({ referralCode }: { referralCode?: string }) => Promise<void>;

  /**
   * Loading state for optin operation
   */
  optinLoading: boolean;
  /**
   * Error message from optin process
   */
  optinError: string | null;
  /**
   * Function to clear the optin error
   */
  clearOptinError: () => void;
}

export const useOptin = (): UseOptinResult => {
  const account = useSelector(selectSelectedInternalAccount);
  const [optinError, setOptinError] = useState<string | null>(null);
  const dispatch = useDispatch();
  const [optinLoading, setOptinLoading] = useState<boolean>(false);
  const { trackEvent, createEventBuilder, addTraitsToUser } = useMetrics();

  const handleOptin = useCallback(
    async ({ referralCode }: { referralCode?: string }) => {
      if (!account) {
        return;
      }
      const referred = Boolean(referralCode);
      trackEvent(
        createEventBuilder(MetaMetricsEvents.REWARDS_OPT_IN_STARTED)
          .addProperties({
            referred,
            referral_code_used: referralCode,
          })
          .build(),
      );

      try {
        setOptinLoading(true);
        setOptinError(null);

        const subscriptionId = await Engine.controllerMessenger.call(
          'RewardsController:optIn',
          account,
          referralCode || undefined,
        );
        if (subscriptionId) {
          dispatch(setCandidateSubscriptionId(subscriptionId));
          addTraitsToUser({
            [UserProfileProperty.HAS_REWARDS_OPTED_IN]: UserProfileProperty.ON,
          });
          trackEvent(
            createEventBuilder(MetaMetricsEvents.REWARDS_OPT_IN_COMPLETED)
              .addProperties({
                referred,
                referral_code_used: referralCode,
              })
              .build(),
          );
        }
      } catch (error) {
        trackEvent(
          createEventBuilder(MetaMetricsEvents.REWARDS_OPT_IN_FAILED)
            .addProperties({
              referred,
              referral_code_used: referralCode,
            })
            .build(),
        );
        const errorMessage = handleRewardsErrorMessage(error);
        setOptinError(errorMessage);
      } finally {
        setOptinLoading(false);
      }
    },
    [account, createEventBuilder, dispatch, trackEvent, addTraitsToUser],
  );

  const clearOptinError = useCallback(() => setOptinError(null), []);

  return {
    optin: handleOptin,
    optinLoading,
    optinError,
    clearOptinError,
  };
};

export default useOptin;
