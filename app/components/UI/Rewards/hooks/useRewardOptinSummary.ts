import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  selectAccountGroupsByWallet,
  selectSelectedAccountGroup,
} from '../../../../selectors/multichainAccounts/accountTreeController';
import { selectInternalAccountsById } from '../../../../selectors/accountsController';
import { InternalAccount } from '@metamask/keyring-internal-api';
import {
  AccountGroupObject,
  AccountWalletObject,
} from '@metamask/account-tree-controller';
import Engine from '../../../../core/Engine';
import { OptInStatusDto } from '../../../../core/Engine/controllers/rewards-controller/types';
import Logger from '../../../../util/Logger';
import { groupBy } from 'lodash';
import { AccountGroupId } from '@metamask/account-api';
import { useInvalidateByRewardEvents } from './useInvalidateByRewardEvents';

export interface AccountWithOptInStatus extends InternalAccount {
  hasOptedIn: boolean;
  accountGroup: AccountGroupObject;
  accountGroupWallet: AccountWalletObject;
}

export interface AccountGroupWithOptInStatus {
  id: AccountGroupId;
  name: string;
  optedInAccounts: AccountWithOptInStatus[];
  optedOutAccounts: AccountWithOptInStatus[];
}

export interface WalletWithAccountGroupsWithOptInStatus {
  wallet: AccountWalletObject;
  groups: AccountGroupWithOptInStatus[];
}

interface useRewardOptinSummaryResult {
  bySelectedAccountGroup: AccountGroupWithOptInStatus | null;
  byWallet: WalletWithAccountGroupsWithOptInStatus[];
  isLoading: boolean;
  hasError: boolean;
  refresh: () => Promise<void>;
}

export const useRewardOptinSummary = (): useRewardOptinSummaryResult => {
  const selectedAccountGroup = useSelector(selectSelectedAccountGroup);
  const accountGroupsByWallet = useSelector(selectAccountGroupsByWallet);
  const internalAccountsById = useSelector(selectInternalAccountsById);
  const [optedInAccounts, setOptedInAccounts] = useState<
    AccountWithOptInStatus[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  // Memoize accounts to avoid unnecessary re-renders - flatten all internal accounts from all wallets
  const flattenedAccounts = useMemo(() => {
    if (!accountGroupsByWallet || !internalAccountsById) return [];

    // Flatten all internal accounts from all account groups across all wallets
    const accountIds = accountGroupsByWallet.flatMap((accountGroup) =>
      accountGroup.data.flatMap((group) => group.accounts),
    );

    // Convert account IDs to internal account objects
    return accountIds
      .map((accountId) => internalAccountsById[accountId])
      .filter((account): account is InternalAccount => account !== undefined);
  }, [accountGroupsByWallet, internalAccountsById]);

  // Fetch opt-in status for all accounts
  const fetchOptInStatus = useCallback(async () => {
    if (
      !selectedAccountGroup ||
      !flattenedAccounts.length ||
      !accountGroupsByWallet.length
    ) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setHasError(false);
      const addresses = flattenedAccounts.map((account) => account.address);

      const response: OptInStatusDto = await Engine.controllerMessenger.call(
        'RewardsController:getOptInStatus',
        { addresses },
      );

      // Map all accounts with their opt-in status, account group, and wallet info
      const accountsWithStatus: AccountWithOptInStatus[] = [];
      for (let i = 0; i < flattenedAccounts.length; i++) {
        const account = flattenedAccounts[i];
        const hasOptedIn = response.ois[i] || false;
        // Find the account group and wallet for this account
        let accountGroup: AccountGroupObject | undefined;
        let accountGroupWallet: AccountWalletObject | undefined;
        for (const wallet of accountGroupsByWallet || []) {
          for (const group of wallet.data) {
            if (group.accounts.includes(account.id)) {
              accountGroup = group;
              accountGroupWallet = wallet.wallet;
              break;
            }
          }
          if (accountGroup && accountGroupWallet) break;
        }

        if (accountGroup && accountGroupWallet) {
          accountsWithStatus.push({
            ...account,
            hasOptedIn,
            accountGroup,
            accountGroupWallet,
          });
        }
      }

      setOptedInAccounts(accountsWithStatus);
    } catch (error) {
      Logger.log('useRewardOptinSummary: Failed to fetch opt-in status', error);
      setHasError(true);
      setOptedInAccounts([]);
    } finally {
      setIsLoading(false);
    }
  }, [flattenedAccounts, selectedAccountGroup, accountGroupsByWallet]);

  const refresh = useCallback(() => {
    setIsLoading(true);
    setHasError(false);
    setOptedInAccounts([]);
    fetchOptInStatus();
  }, [fetchOptInStatus]);

  useInvalidateByRewardEvents(['RewardsController:accountLinked'], refresh);

  // Fetch opt-in status when accounts change or enabled changes
  useEffect(() => {
    if (selectedAccountGroup) {
      fetchOptInStatus();
    }
  }, [fetchOptInStatus, selectedAccountGroup]);

  // Create selected account group with opt-in status
  const bySelectedAccountGroup = useMemo(() => {
    if (!selectedAccountGroup) return null;

    const accountsInSelectedGroup = optedInAccounts.filter(
      (account) => account.accountGroup.id === selectedAccountGroup.id,
    );

    return {
      id: selectedAccountGroup.id,
      name: selectedAccountGroup.metadata.name,
      optedInAccounts: accountsInSelectedGroup.filter(
        (account) => account.hasOptedIn,
      ),
      optedOutAccounts: accountsInSelectedGroup.filter(
        (account) => !account.hasOptedIn,
      ),
    };
  }, [optedInAccounts, selectedAccountGroup]);

  // Group all accounts by wallet
  const byWallet = useMemo(() => {
    // Filter out accounts without required data
    const validAccounts = optedInAccounts.filter(
      (account) => account.accountGroup && account.accountGroupWallet,
    );

    // Group by wallet ID
    const accountsByWallet = groupBy(
      validAccounts,
      (account) => account.accountGroupWallet?.id || 'unknown',
    );

    // Transform to the required structure
    return Object.entries(accountsByWallet)
      .map(([_, walletAccounts]) => {
        const firstAccount = walletAccounts[0];
        const wallet = firstAccount.accountGroupWallet;

        if (!wallet) return null;

        // Group accounts by account group within each wallet
        const accountsByGroup = groupBy(
          walletAccounts,
          (account) => account.accountGroup?.id,
        );

        const groups = Object.entries(accountsByGroup)
          .filter(
            ([, groupAccounts]) =>
              groupAccounts[0]?.accountGroup && groupAccounts.length > 0,
          )
          .map(([, groupAccounts]) => {
            const accountGroup = groupAccounts[0].accountGroup;
            return {
              id: accountGroup.id,
              name: accountGroup.metadata.name,
              optedInAccounts: groupAccounts.filter(
                (account) => account.hasOptedIn,
              ),
              optedOutAccounts: groupAccounts.filter(
                (account) => !account.hasOptedIn,
              ),
            };
          });

        return {
          wallet,
          groups,
        };
      })
      .filter(Boolean) as WalletWithAccountGroupsWithOptInStatus[];
  }, [optedInAccounts]);

  return {
    bySelectedAccountGroup,
    byWallet,
    isLoading,
    hasError,
    refresh: fetchOptInStatus,
  };
};
