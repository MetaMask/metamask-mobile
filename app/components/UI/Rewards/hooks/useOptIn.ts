import { useCallback, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { handleRewardsErrorMessage } from '../utils';
import { setCandidateSubscriptionId } from '../../../../reducers/rewards';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
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
import { useBulkLinkState } from './useBulkLinkState';

const hasSideEffectAccounts = (
  sideEffectAccountGroupId: string | undefined,
  sideEffectAccounts: InternalAccount[],
): boolean =>
  Boolean(sideEffectAccountGroupId) && sideEffectAccounts.length > 0;

/**
 * Prefer the first account group in the wallet when it has accounts.
 * Otherwise opt in the currently selected group.
 */
const selectAccountsToOptIn = (
  sideEffectAccountGroupId: string | undefined,
  sideEffectAccounts: InternalAccount[],
  activeGroupAccounts: InternalAccount[],
): InternalAccount[] => {
  if (hasSideEffectAccounts(sideEffectAccountGroupId, sideEffectAccounts)) {
    return sideEffectAccounts;
  }
  return activeGroupAccounts;
};

/**
 * After opt-in, link the selected group when it is not the group that was
 * just opted in. When there is no side-effect group, link that id if present.
 */
const selectAccountGroupToLinkAfterOptIn = (
  sideEffectAccountGroupId: string | undefined,
  sideEffectAccounts: InternalAccount[],
  selectedAccountGroupId: string,
): string | undefined => {
  if (!hasSideEffectAccounts(sideEffectAccountGroupId, sideEffectAccounts)) {
    return sideEffectAccountGroupId;
  }
  if (sideEffectAccountGroupId !== selectedAccountGroupId) {
    return selectedAccountGroupId;
  }
  return undefined;
};

export interface UseOptinResult {
  /**
   * Function to initiate the optin process
   * @param bulkLink - If true, bulk link all other account groups after opt-in succeeds
   */
  optin: ({ bulkLink }: { bulkLink?: boolean }) => Promise<void>;

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
  const { trackEvent, createEventBuilder, identify } = useAnalytics();
  const { linkAccountGroup } = useLinkAccountGroup(false);
  const { startBulkLink, cancelBulkLink } = useBulkLinkState();
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
    async ({ bulkLink }: { bulkLink?: boolean }) => {
      if (!accountGroup?.id) {
        return;
      }
      const selectedAccountGroupId = accountGroup.id;
      const metricsProps = {
        bulk_link: bulkLink,
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

        // Cancel any running bulk link operation to prevent errors during opt-in
        cancelBulkLink();

        // Opt in the first account group in the wallet, then link the
        // currently selected group when it is a different group.
        const accountsToOptIn = selectAccountsToOptIn(
          sideEffectAccountGroupIdToLink,
          sideEffectAccounts,
          activeGroupAccounts,
        );
        const accountGroupToLinkAfterOptIn = selectAccountGroupToLinkAfterOptIn(
          sideEffectAccountGroupIdToLink,
          sideEffectAccounts,
          selectedAccountGroupId,
        );

        subscriptionId = await Engine.controllerMessenger.call(
          'RewardsController:optIn',
          accountsToOptIn as InternalAccount[],
        );

        if (subscriptionId) {
          if (bulkLink) {
            startBulkLink();
          } else if (accountGroupToLinkAfterOptIn) {
            try {
              await linkAccountGroup(
                accountGroupToLinkAfterOptIn as AccountGroupId,
              );
            } catch {
              // Failed to link first account group in same wallet.
            }
          }
          identify({
            [UserProfileProperty.HAS_REWARDS_OPTED_IN]: UserProfileProperty.ON,
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
      identify,
      linkAccountGroup,
      dispatch,
      startBulkLink,
      cancelBulkLink,
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
