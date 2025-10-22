import { useCallback, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { handleRewardsErrorMessage } from '../utils';
import Engine from '../../../../core/Engine';
import { setCandidateSubscriptionId } from '../../../../reducers/rewards';
import { MetaMetricsEvents, useMetrics } from '../../../hooks/useMetrics';
import { UserProfileProperty } from '../../../../util/metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import { selectMultichainAccountsState2Enabled } from '../../../../selectors/featureFlagController/multichainAccounts/enabledMultichainAccounts';
import {
  selectSelectedAccountGroup,
  selectAccountGroupsByWallet,
  selectWalletByAccount,
} from '../../../../selectors/multichainAccounts/accountTreeController';
import { useLinkAccountGroup } from './useLinkAccountGroup';
import { selectSelectedInternalAccount } from '../../../../selectors/accountsController';

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
  const accountGroup = useSelector(selectSelectedAccountGroup);
  const [optinError, setOptinError] = useState<string | null>(null);
  const dispatch = useDispatch();
  const [optinLoading, setOptinLoading] = useState<boolean>(false);
  const { trackEvent, createEventBuilder, addTraitsToUser } = useMetrics();
  const { linkAccountGroup } = useLinkAccountGroup(false);
  const activeAccount = useSelector(selectSelectedInternalAccount);
  const walletsMap = useSelector(selectWalletByAccount);
  const accountGroupsByWallet = useSelector(selectAccountGroupsByWallet);
  const currentAccountWalletId = useMemo(
    () => (activeAccount ? walletsMap(activeAccount.id)?.id : null),
    [activeAccount, walletsMap],
  );
  const sideEffectAccountGroupIdToLink = useMemo(
    () =>
      accountGroupsByWallet?.find(
        (accGroup) => accGroup.wallet.id === currentAccountWalletId,
      )?.data?.[0]?.id,
    [accountGroupsByWallet, currentAccountWalletId],
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
      if (!accountGroup?.id) {
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

      let subscriptionId: string | null = null;

      try {
        setOptinLoading(true);
        setOptinError(null);

        subscriptionId = await Engine.controllerMessenger.call(
          'RewardsController:optIn', // for active account group
          referralCode || undefined,
        );
        if (subscriptionId) {
          addTraitsToUser({
            [UserProfileProperty.HAS_REWARDS_OPTED_IN]: UserProfileProperty.ON,
            ...(referralCode && {
              [UserProfileProperty.REWARDS_REFERRED]: true,
              [UserProfileProperty.REWARDS_REFERRAL_CODE_USED]: referralCode,
            }),
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
      }

      if (
        multichainAccountsState2Enabled &&
        sideEffectAccountGroupIdToLink &&
        subscriptionId
      ) {
        if (
          sideEffectAccountGroupIdToLink &&
          sideEffectAccountGroupIdToLink !== accountGroup?.id
        ) {
          try {
            await linkAccountGroup(sideEffectAccountGroupIdToLink);
          } catch {
            // Failed to link first account group in same wallet.
          }
        }
      }

      if (subscriptionId) {
        dispatch(setCandidateSubscriptionId(subscriptionId));
      }

      setOptinLoading(false);
    },
    [
      accountGroup?.id,
      trackEvent,
      createEventBuilder,
      sideEffectAccountGroupIdToLink,
      multichainAccountsState2Enabled,
      dispatch,
      addTraitsToUser,
      linkAccountGroup,
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
