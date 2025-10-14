import { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import { AccountGroupId } from '@metamask/account-api';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { selectInternalAccountsByGroupId } from '../../../../selectors/multichainAccounts/accounts';
import Engine from '../../../../core/Engine';
import { OptInStatusDto } from '../../../../core/Engine/controllers/rewards-controller/types';
import { MetaMetricsEvents, useMetrics } from '../../../hooks/useMetrics';
import { deriveAccountMetricProps } from '../utils';
import { IMetaMetricsEvent } from '../../../../core/Analytics';
import useRewardsToast from './useRewardsToast';
import { strings } from '../../../../../locales/i18n';
import { selectAccountGroupsByWallet } from '../../../../selectors/multichainAccounts/accountTreeController';

interface LinkStatusReport {
  success: boolean;
  byAddress: Record<string, boolean>;
}

interface UseLinkAccountGroupResult {
  linkAccountGroup: (
    accountGroupId: AccountGroupId,
  ) => Promise<LinkStatusReport>;
  isLoading: boolean;
  isError: boolean;
}

export const useLinkAccountGroup = (
  showToasts: boolean = true,
): UseLinkAccountGroupResult => {
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  const getAccountsByGroupId = useSelector(selectInternalAccountsByGroupId);
  const accountGroupsByWallet = useSelector(selectAccountGroupsByWallet);
  const { trackEvent, createEventBuilder } = useMetrics();
  const { showToast, RewardsToastOptions } = useRewardsToast();
  const triggerAccountLinkingEvent = useCallback(
    (event: IMetaMetricsEvent, account: InternalAccount) => {
      const accountMetricProps = deriveAccountMetricProps(account);
      trackEvent(
        createEventBuilder(event).addProperties(accountMetricProps).build(),
      );
    },
    [createEventBuilder, trackEvent],
  );

  const linkAccountGroup = useCallback(
    async (accountGroupId: AccountGroupId): Promise<LinkStatusReport> => {
      setIsLoading(true);
      setIsError(false);
      const byAddress: Record<string, boolean> = {};
      const accountGroup = accountGroupsByWallet
        .flatMap((wallet) => wallet.data)
        .find((group) => group.id === accountGroupId);

      try {
        const supportedGroupAccounts = getAccountsByGroupId(
          accountGroupId,
        )?.filter((account) =>
          Engine.controllerMessenger.call(
            'RewardsController:isOptInSupported',
            account,
          ),
        );

        if (supportedGroupAccounts.length === 0) {
          setIsError(true);
          if (showToasts) {
            showToast(
              RewardsToastOptions.error(
                strings('rewards.link_account_group.link_account_error', {
                  accountName: accountGroup?.metadata.name || 'Account',
                }),
              ),
            );
          }
          return { success: false, byAddress };
        }

        // Initialize all accounts as not linked
        supportedGroupAccounts.forEach((account) => {
          byAddress[account.address] = false;
        });

        // Only process eligible accounts for opt-in status check
        const addresses = supportedGroupAccounts.map(
          (account) => account.address,
        );
        const optInResponse: OptInStatusDto =
          await Engine.controllerMessenger.call(
            'RewardsController:getOptInStatus',
            { addresses },
          );

        // Map opt-in status for eligible accounts only
        supportedGroupAccounts.forEach((account, index) => {
          if (optInResponse.ois[index]) {
            byAddress[account.address] = true;
          }
        });

        const accountsToLink = supportedGroupAccounts.filter(
          (_, index) => optInResponse.ois[index] === false,
        );

        if (accountsToLink.length === 0) {
          return { success: true, byAddress };
        }

        // Emit started events for all accounts before calling the function
        for (const account of accountsToLink) {
          triggerAccountLinkingEvent(
            MetaMetricsEvents.REWARDS_ACCOUNT_LINKING_STARTED,
            account,
          );
        }

        try {
          const results = await Engine.controllerMessenger.call(
            'RewardsController:linkAccountsToSubscriptionCandidate',
            accountsToLink,
          );

          // Process results and emit completion/failure events
          for (const result of results) {
            byAddress[result.account.address] = result.success;
            if (result.success) {
              triggerAccountLinkingEvent(
                MetaMetricsEvents.REWARDS_ACCOUNT_LINKING_COMPLETED,
                result.account,
              );
            } else {
              triggerAccountLinkingEvent(
                MetaMetricsEvents.REWARDS_ACCOUNT_LINKING_FAILED,
                result.account,
              );
            }
          }
        } catch (err) {
          // Mark all accounts as failed and emit failure events
          for (const account of accountsToLink) {
            byAddress[account.address] = false;
            triggerAccountLinkingEvent(
              MetaMetricsEvents.REWARDS_ACCOUNT_LINKING_FAILED,
              account,
            );
          }
        }

        const fullySucceeded = Object.values(byAddress).every(
          (status) => status,
        );

        if (fullySucceeded) {
          if (showToasts) {
            showToast(
              RewardsToastOptions.success(
                strings('rewards.link_account_group.link_account_success', {
                  accountName: accountGroup?.metadata.name || 'Account',
                }),
              ),
            );
          }
          return { success: true, byAddress };
        }

        if (showToasts) {
          showToast(
            RewardsToastOptions.error(
              strings('rewards.link_account_group.link_account_error', {
                accountName: accountGroup?.metadata.name || 'Account',
              }),
            ),
          );
        }
        setIsError(true);
        return { success: false, byAddress };
      } catch (err) {
        if (showToasts) {
          showToast(
            RewardsToastOptions.error(
              strings('rewards.link_account_group.link_account_error', {
                accountName: accountGroup?.metadata.name || 'Account',
              }),
            ),
          );
        }
        setIsError(true);
        return { success: false, byAddress };
      } finally {
        setIsLoading(false);
      }
    },
    [
      accountGroupsByWallet,
      getAccountsByGroupId,
      showToasts,
      triggerAccountLinkingEvent,
      showToast,
      RewardsToastOptions,
    ],
  );

  return {
    linkAccountGroup,
    isLoading,
    isError,
  };
};
