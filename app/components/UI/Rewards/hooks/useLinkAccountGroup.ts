import { useCallback, useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import { AccountGroupId } from '@metamask/account-api';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { selectInternalAccountsByGroupId } from '../../../../selectors/multichainAccounts/accounts';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { OptInStatusDto } from '../../../../core/Engine/controllers/rewards-controller/types';
import { MetaMetricsEvents, useMetrics } from '../../../hooks/useMetrics';
import { deriveAccountMetricProps } from '../utils';
import { IMetaMetricsEvent } from '../../../../core/Analytics';

interface LinkStatusReport {
  success: boolean;
  byAddress: Record<string, boolean>;
}

interface LinkProgress {
  currentAddress: string | null;
  totalCount: number;
  completedCount: number;
  failedCount: number;
}

interface UseLinkAccountGroupResult {
  linkAccountGroup: (
    accountGroupId: AccountGroupId,
  ) => Promise<LinkStatusReport>;
  isLoading: boolean;
  isLoadingTarget: AccountGroupId | null;
  isError: boolean;
  progress: LinkProgress | null;
  cancelLinking: () => void;
}

export const useLinkAccountGroup = (): UseLinkAccountGroupResult => {
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isLoadingTarget, setIsLoadingTarget] = useState<AccountGroupId | null>(
    null,
  );
  const [progress, setProgress] = useState<LinkProgress | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const getAccountsByGroupId = useSelector(selectInternalAccountsByGroupId);
  const { trackEvent, createEventBuilder } = useMetrics();

  const triggerAccountLinkingEvent = useCallback(
    (event: IMetaMetricsEvent, account: InternalAccount) => {
      const accountMetricProps = deriveAccountMetricProps(account);
      trackEvent(
        createEventBuilder(event).addProperties(accountMetricProps).build(),
      );
    },
    [createEventBuilder, trackEvent],
  );

  const cancelLinking = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const linkAccountGroup = useCallback(
    async (accountGroupId: AccountGroupId): Promise<LinkStatusReport> => {
      abortControllerRef.current = new AbortController();
      const { signal } = abortControllerRef.current;
      setIsLoading(true);
      setIsLoadingTarget(accountGroupId);
      setIsError(false);
      const byAddress: Record<string, boolean> = {};

      try {
        if (signal.aborted) {
          throw new Error('Operation cancelled');
        }

        const groupAccounts = getAccountsByGroupId(accountGroupId);
        if (groupAccounts.length === 0) {
          setIsError(true);
          return { success: false, byAddress };
        }

        groupAccounts.forEach((account) => {
          byAddress[account.address] = false;
        });

        const addresses = groupAccounts.map((account) => account.address);
        const optInResponse: OptInStatusDto =
          await Engine.controllerMessenger.call(
            'RewardsController:getOptInStatus',
            { addresses },
          );

        groupAccounts.forEach((account, index) => {
          if (optInResponse.ois[index]) {
            byAddress[account.address] = true;
          }
        });

        const accountsToLink = groupAccounts.filter(
          (_, index) => !optInResponse.ois[index],
        );

        if (accountsToLink.length === 0) {
          setProgress({
            currentAddress: null,
            totalCount: groupAccounts.length,
            completedCount: groupAccounts.length,
            failedCount: 0,
          });
          return { success: true, byAddress };
        }

        setProgress({
          currentAddress: null,
          totalCount: accountsToLink.length,
          completedCount: 0,
          failedCount: 0,
        });

        let completedCount = 0;
        let failedCount = 0;

        for (const account of accountsToLink) {
          if (signal.aborted) {
            throw new Error('Operation cancelled');
          }

          setProgress({
            currentAddress: account.address,
            totalCount: accountsToLink.length,
            completedCount,
            failedCount,
          });

          try {
            triggerAccountLinkingEvent(
              MetaMetricsEvents.REWARDS_ACCOUNT_LINKING_STARTED,
              account,
            );

            const success = await Engine.controllerMessenger.call(
              'RewardsController:linkAccountToSubscriptionCandidate',
              account,
            );

            byAddress[account.address] = success;
            if (success) {
              completedCount++;
              triggerAccountLinkingEvent(
                MetaMetricsEvents.REWARDS_ACCOUNT_LINKING_COMPLETED,
                account,
              );
            } else {
              failedCount++;
              triggerAccountLinkingEvent(
                MetaMetricsEvents.REWARDS_ACCOUNT_LINKING_FAILED,
                account,
              );
            }
          } catch (err) {
            Logger.log(
              'useLinkAccountGroup: Failed to link account',
              account.address,
              err,
            );
            byAddress[account.address] = false;
            failedCount++;
            triggerAccountLinkingEvent(
              MetaMetricsEvents.REWARDS_ACCOUNT_LINKING_FAILED,
              account,
            );
          }

          setProgress({
            currentAddress: account.address,
            totalCount: accountsToLink.length,
            completedCount,
            failedCount,
          });
        }

        setProgress({
          currentAddress: null,
          totalCount: accountsToLink.length,
          completedCount,
          failedCount,
        });

        const fullySucceeded = Object.values(byAddress).every(
          (status) => status,
        );

        Logger.log('useLinkAccountGroup: Fully succeeded', fullySucceeded);
        if (fullySucceeded) {
          return { success: true, byAddress };
        }

        setIsError(true);
        return { success: false, byAddress };
      } catch (err) {
        if (signal.aborted) {
          Logger.log('useLinkAccountGroup: Operation was cancelled');
          setProgress(null);
          return { success: false, byAddress };
        }

        Logger.log('useLinkAccountGroup: Failed to link account group', err);
        setIsError(true);
        return { success: false, byAddress };
      } finally {
        setIsLoading(false);
        setIsLoadingTarget(null);
        abortControllerRef.current = null;
      }
    },
    [getAccountsByGroupId, triggerAccountLinkingEvent],
  );

  return {
    linkAccountGroup,
    isLoading,
    isLoadingTarget,
    isError,
    progress,
    cancelLinking,
  };
};
