import { useCallback, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectInternalAccountsById,
  selectSelectedInternalAccount,
} from '../../../../selectors/accountsController';
import { handleRewardsErrorMessage } from '../utils';
import Engine from '../../../../core/Engine';
import { setCandidateSubscriptionId } from '../../../../reducers/rewards';
import { MetaMetricsEvents, useMetrics } from '../../../hooks/useMetrics';
import { UserProfileProperty } from '../../../../util/metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import { selectMultichainAccountsState2Enabled } from '../../../../selectors/featureFlagController/multichainAccounts/enabledMultichainAccounts';
import {
  selectAccountGroupsByWallet,
  selectWalletByAccount,
} from '../../../../selectors/multichainAccounts/accountTreeController';

export interface UseOptinResult {
  /**
   * Function to initiate the optin process
   */
  optin: ({
    referralCode,
    isPrefilled,
  }: {
    referralCode?: string;
    isPrefilled?: boolean;
  }) => Promise<void>;

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
  const walletSections = useSelector(selectAccountGroupsByWallet);
  const walletByAccount = useSelector(selectWalletByAccount);
  const currentAccountWalletId = useMemo(
    () => (account ? walletByAccount(account.id) : null),
    [account, walletByAccount],
  );
  const currentWalletSection = useMemo(
    () =>
      walletSections?.find(
        (section) => section.wallet.id === currentAccountWalletId?.id,
      ),
    [walletSections, currentAccountWalletId],
  );
  const internalAccountsById = useSelector(selectInternalAccountsById);
  const sideEffectAccountToLink = useMemo(
    () =>
      currentWalletSection?.data[0]?.accounts[0] &&
      internalAccountsById &&
      currentWalletSection.data[0].accounts[0] in internalAccountsById
        ? internalAccountsById[currentWalletSection.data[0].accounts[0]]
        : null,
    [currentWalletSection, internalAccountsById],
  );
  const multichainAccountsState2Enabled = useSelector(
    selectMultichainAccountsState2Enabled,
  );

  const handleOptin = useCallback(
    async ({
      referralCode,
      isPrefilled,
    }: {
      referralCode?: string;
      isPrefilled?: boolean;
    }) => {
      if (!account) {
        return;
      }
      const referred = Boolean(referralCode);
      const metricsProps = {
        referred,
        referral_code_used: referralCode,
        referral_code_input_type: isPrefilled ? 'prefill' : 'manual',
      };
      trackEvent(
        createEventBuilder(MetaMetricsEvents.REWARDS_OPT_IN_STARTED)
          .addProperties(metricsProps)
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
              .addProperties(metricsProps)
              .build(),
          );
        }
      } catch (error) {
        trackEvent(
          createEventBuilder(MetaMetricsEvents.REWARDS_OPT_IN_FAILED)
            .addProperties(metricsProps)
            .build(),
        );
        const errorMessage = handleRewardsErrorMessage(error);
        setOptinError(errorMessage);
      } finally {
        setOptinLoading(false);
      }

      if (multichainAccountsState2Enabled && sideEffectAccountToLink) {
        try {
          if (
            sideEffectAccountToLink &&
            sideEffectAccountToLink.id !== account.address
          ) {
            Engine.controllerMessenger.call(
              'RewardsController:linkAccountToSubscriptionCandidate',
              sideEffectAccountToLink,
            );
          }
        } catch {
          // ignore error, we tried to opt in to rewards for the default account as well.
        }
      }
    },
    [
      account,
      trackEvent,
      createEventBuilder,
      multichainAccountsState2Enabled,
      sideEffectAccountToLink,
      dispatch,
      addTraitsToUser,
    ],
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
