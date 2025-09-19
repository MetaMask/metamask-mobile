import { useCallback, useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import { AccountGroupId } from '@metamask/account-api';
import { selectInternalAccountsByGroupId } from '../../../../selectors/multichainAccounts/accounts';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { OptInStatusDto } from '../../../../core/Engine/controllers/rewards-controller/types';

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

  // AbortController for cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  // Selectors
  const getAccountsByGroupId = useSelector(selectInternalAccountsByGroupId);

  // Cancel linking function
  const cancelLinking = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const linkAccountGroup = useCallback(
    async (accountGroupId: AccountGroupId): Promise<LinkStatusReport> => {
      // Create new abort controller for this operation
      abortControllerRef.current = new AbortController();
      const { signal } = abortControllerRef.current;

      setIsLoading(true);
      setIsLoadingTarget(accountGroupId);
      setIsError(false);

      const byAddress: Record<string, boolean> = {};

      try {
        // Check if cancelled before starting
        if (signal.aborted) {
          throw new Error('Operation cancelled');
        }

        // Get all accounts for the group
        const groupAccounts = getAccountsByGroupId(accountGroupId);

        if (groupAccounts.length === 0) {
          setIsError(true);
          return { success: false, byAddress };
        }

        // Initialize byAddress with all accounts
        groupAccounts.forEach((account) => {
          byAddress[account.address] = false;
        });

        // Check opt-in status for all accounts first
        const addresses = groupAccounts.map((account) => account.address);
        const optInResponse: OptInStatusDto =
          await Engine.controllerMessenger.call(
            'RewardsController:getOptInStatus',
            { addresses },
          );

        // Mark already opted-in accounts as successful
        groupAccounts.forEach((account, index) => {
          if (optInResponse.ois[index]) {
            byAddress[account.address] = true;
          }
        });

        // Filter out accounts that are already opted in
        const accountsToLink = groupAccounts.filter(
          (_, index) => !optInResponse.ois[index],
        );

        if (accountsToLink.length === 0) {
          // All accounts are already linked
          setProgress({
            currentAddress: null,
            totalCount: groupAccounts.length,
            completedCount: groupAccounts.length,
            failedCount: 0,
          });
          return { success: true, byAddress };
        }

        // Initialize progress
        setProgress({
          currentAddress: null,
          totalCount: accountsToLink.length,
          completedCount: 0,
          failedCount: 0,
        });

        let completedCount = 0;
        let failedCount = 0;

        for (const account of accountsToLink) {
          // Check if cancelled
          if (signal.aborted) {
            throw new Error('Operation cancelled');
          }

          // Update current linking address
          setProgress({
            currentAddress: account.address,
            totalCount: accountsToLink.length,
            completedCount,
            failedCount,
          });

          try {
            const success = await Engine.controllerMessenger.call(
              'RewardsController:linkAccountToSubscriptionCandidate',
              account,
            );

            byAddress[account.address] = success;

            if (success) {
              completedCount++;
            } else {
              failedCount++;
            }
          } catch (err) {
            Logger.log(
              'useLinkAccountGroup: Failed to link account',
              account.address,
              err,
            );
            byAddress[account.address] = false;
            failedCount++;
          }

          // Update progress after each account
          setProgress({
            currentAddress: account.address,
            totalCount: accountsToLink.length,
            completedCount,
            failedCount,
          });
        }

        // Clear current linking address
        setProgress({
          currentAddress: null,
          totalCount: accountsToLink.length,
          completedCount,
          failedCount,
        });

        // Determine final status
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
          // Reset state on cancellation
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
    [getAccountsByGroupId],
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
