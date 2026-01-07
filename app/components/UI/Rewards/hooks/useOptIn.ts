import { useCallback, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { handleRewardsErrorMessage } from '../utils';
import { setCandidateSubscriptionId } from '../../../../reducers/rewards';
import { MetaMetricsEvents, useMetrics } from '../../../hooks/useMetrics';
import { UserProfileProperty } from '../../../../util/metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import {
  selectSelectedAccountGroup,
  selectAccountGroupsByWallet,
  selectWalletByAccount,
  selectSelectedAccountGroupInternalAccounts,
} from '../../../../selectors/multichainAccounts/accountTreeController';
import { selectInternalAccountsByGroupId } from '../../../../selectors/multichainAccounts/accounts';
import { selectSelectedInternalAccount } from '../../../../selectors/accountsController';
import Engine from '../../../../core/Engine';
import { useLinkAccountGroup } from './useLinkAccountGroup';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { AccountGroupId } from '@metamask/account-api';

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
  const activeGroupAccounts = useSelector(
    selectSelectedAccountGroupInternalAccounts,
  );
  const selectInternalAccountsByGroupIdSelector = useSelector(
    selectInternalAccountsByGroupId,
  );
  const sideEffectAccounts = useMemo(() => {
    if (!sideEffectAccountGroupIdToLink) {
      return [];
    }
    return selectInternalAccountsByGroupIdSelector(
      sideEffectAccountGroupIdToLink,
    );
  }, [sideEffectAccountGroupIdToLink, selectInternalAccountsByGroupIdSelector]);

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
      const selectedAccountGroupId = accountGroup.id;
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

        // Make sure to always opt in the first account group in the wallet first
        // Then link the side effect account group (currently selected) if it exists

        const accountsToOptIn =
          sideEffectAccountGroupIdToLink && sideEffectAccounts.length > 0
            ? sideEffectAccounts
            : activeGroupAccounts;

        const accountGroupToLinkAfterOptIn =
          sideEffectAccountGroupIdToLink && sideEffectAccounts.length > 0
            ? sideEffectAccountGroupIdToLink !== selectedAccountGroupId
              ? selectedAccountGroupId
              : undefined
            : sideEffectAccountGroupIdToLink;

        subscriptionId = await Engine.controllerMessenger.call(
          'RewardsController:optIn',
          accountsToOptIn as InternalAccount[],
          referralCode || undefined,
        );

        if (subscriptionId) {
          if (accountGroupToLinkAfterOptIn) {
            try {
              await linkAccountGroup(
                accountGroupToLinkAfterOptIn as AccountGroupId,
              );
            } catch {
              // Failed to link first account group in same wallet.
            }
          }
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
        } else {
          throw new Error(
            'Failed to opt in any account from the account group',
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
      sideEffectAccounts,
      activeGroupAccounts,
      addTraitsToUser,
      linkAccountGroup,
      dispatch,
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
