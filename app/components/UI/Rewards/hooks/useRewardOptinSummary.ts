import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { UserProfileProperty } from '../../../../util/metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { useAccountsOperationsLoadingStates } from '../../../../util/accounts/useAccountsOperationsLoadingStates';
import { selectRewardsActiveAccountSubscriptionId } from '../../../../selectors/rewards';
import { useMetrics } from '../../../hooks/useMetrics';
import { convertInternalAccountToCaipAccountId } from '../utils';

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
  currentAccountGroupFullyOptedIn: boolean | null;
  currentAccountGroupFullySupported: boolean | null;
}

export const useRewardOptinSummary = (): useRewardOptinSummaryResult => {
  const selectedAccountGroup = useSelector(selectSelectedAccountGroup);
  const activeAccountSubscriptionId = useSelector(
    selectRewardsActiveAccountSubscriptionId,
  );
  const accountGroupsByWallet = useSelector(selectAccountGroupsByWallet);
  const internalAccountsById = useSelector(selectInternalAccountsById);
  const [optedInAccounts, setOptedInAccounts] = useState<
    AccountWithOptInStatus[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [currentAccountGroupFullyOptedIn, setCurrentAccountGroupFullyOptedIn] =
    useState<boolean | null>(null);
  const [
    currentAccountGroupFullySupported,
    setCurrentAccountGroupFullySupported,
  ] = useState<boolean | null>(null);
  const isLoadingRef = useRef(false);
  const hasTrackedLinkedAccountsRef = useRef(false);

  const { addTraitsToUser } = useMetrics();

  // Check if any account operations are loading
  const { isAccountSyncingInProgress } = useAccountsOperationsLoadingStates();

  // Debounce accounts for 30 seconds to avoid excessive re-renders (i.e. profile sync)
  const debouncedAccountGroupsByWallet = useDebouncedValue(
    accountGroupsByWallet,
    isAccountSyncingInProgress ? 10000 : 0,
  );

  const debouncedInternalAccountsById = useDebouncedValue(
    internalAccountsById,
    isAccountSyncingInProgress ? 10000 : 0,
  );

  // Memoize accounts to avoid unnecessary re-renders - flatten all internal accounts from all wallets
  const flattenedAccounts = useMemo(() => {
    if (!debouncedAccountGroupsByWallet || !debouncedInternalAccountsById)
      return [];

    // Flatten all internal accounts from all account groups across all wallets
    const accountIds = debouncedAccountGroupsByWallet.flatMap((accountGroup) =>
      accountGroup.data.flatMap((group) => group.accounts),
    );

    // Convert account IDs to internal account objects
    return accountIds
      .map((accountId) => debouncedInternalAccountsById[accountId])
      .filter((account): account is InternalAccount => account !== undefined);
  }, [debouncedAccountGroupsByWallet, debouncedInternalAccountsById]);

  // Fetch opt-in status for all accounts
  const fetchOptInStatus = useCallback(async () => {
    if (
      !selectedAccountGroup ||
      !flattenedAccounts.length ||
      !debouncedAccountGroupsByWallet.length
    ) {
      setIsLoading(false);
      return;
    }
    if (isLoadingRef.current) {
      return;
    }

    isLoadingRef.current = true;

    try {
      setIsLoading(true);
      setHasError(false);
      setCurrentAccountGroupFullyOptedIn(null);
      setCurrentAccountGroupFullySupported(null);
      const supportedAccounts: InternalAccount[] =
        flattenedAccounts?.filter((account: InternalAccount) =>
          Engine.controllerMessenger.call(
            'RewardsController:isOptInSupported',

            account,
          ),
        ) || [];

      const response: OptInStatusDto = await Engine.controllerMessenger.call(
        'RewardsController:getOptInStatus',
        { addresses: supportedAccounts.map((account) => account.address) },
      );

      // Map all accounts with their opt-in status, account group, and wallet info
      const accountsWithStatus: AccountWithOptInStatus[] = [];
      for (let i = 0; i < flattenedAccounts.length; i++) {
        const account = flattenedAccounts[i];
        if (!account) continue;
        const hasOptedIn = response.ois[i] || false;
        // Find the account group and wallet for this account
        let accountGroup: AccountGroupObject | undefined;
        let accountGroupWallet: AccountWalletObject | undefined;
        for (const wallet of debouncedAccountGroupsByWallet || []) {
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

      // Apply coercion logic right after fetching the result
      const linkedAccounts = accountsWithStatus.filter(
        (account) => account.hasOptedIn,
      );

      const firstSubscriptionId = Engine.controllerMessenger.call(
        'RewardsController:getFirstSubscriptionId',
      );

      let coercedLinkedAccounts = linkedAccounts;
      if (
        activeAccountSubscriptionId &&
        firstSubscriptionId &&
        activeAccountSubscriptionId !== firstSubscriptionId
      ) {
        const accountsForSameSubscription = linkedAccounts.filter((account) => {
          const caipAccount = convertInternalAccountToCaipAccountId(account);

          if (!caipAccount) {
            return false;
          }

          try {
            const actualSubscriptionId = Engine.controllerMessenger.call(
              'RewardsController:getActualSubscriptionId',
              caipAccount,
            );

            return actualSubscriptionId === activeAccountSubscriptionId;
          } catch (error) {
            return false;
          }
        });

        coercedLinkedAccounts = accountsForSameSubscription;
      }

      // Update user traits with the count of reward-enabled accounts
      if (!hasTrackedLinkedAccountsRef.current) {
        hasTrackedLinkedAccountsRef.current = true;

        const traits = {
          [UserProfileProperty.REWARD_ENABLED_ACCOUNTS_COUNT]:
            coercedLinkedAccounts.length,
        };

        Logger.log(
          'Triggering update of user traits for reward-enabled accounts',
          traits,
        );

        await addTraitsToUser(traits);
      }

      // Update computed values based on current account group
      if (selectedAccountGroup) {
        const accountsInSelectedGroup = accountsWithStatus.filter(
          (account) => account.accountGroup.id === selectedAccountGroup.id,
        );

        // Check if all accounts in the selected group are opted in
        const fullyOptedIn = accountsInSelectedGroup.every(
          (account) => account.hasOptedIn,
        );
        setCurrentAccountGroupFullyOptedIn(fullyOptedIn);

        // Check if all accounts in the selected group are supported
        // Support is determined by checking if the account can opt in to rewards
        const supportChecks = await Promise.all(
          accountsInSelectedGroup.map(async (account) => {
            try {
              const isSupported = await Engine.controllerMessenger.call(
                'RewardsController:isOptInSupported',
                account,
              );
              return isSupported;
            } catch (error) {
              return false;
            }
          }),
        );
        const fullySupported = supportChecks.every(
          (isSupported) => isSupported,
        );
        setCurrentAccountGroupFullySupported(fullySupported);
      } else {
        setCurrentAccountGroupFullyOptedIn(false);
        setCurrentAccountGroupFullySupported(false);
      }

      setOptedInAccounts(accountsWithStatus);
    } catch (error) {
      Logger.log('useRewardOptinSummary: Failed to fetch opt-in status', error);
      setHasError(true);
      setOptedInAccounts([]);
      setCurrentAccountGroupFullyOptedIn(null);
      setCurrentAccountGroupFullySupported(null);
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }, [
    flattenedAccounts,
    selectedAccountGroup,
    debouncedAccountGroupsByWallet,
    activeAccountSubscriptionId,
    addTraitsToUser,
  ]);

  const refresh = useCallback(() => {
    setIsLoading(true);
    setHasError(false);
    setOptedInAccounts([]);
    setCurrentAccountGroupFullyOptedIn(false);
    setCurrentAccountGroupFullySupported(false);
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
    isLoading: isLoading && !optedInAccounts?.length,
    hasError,
    refresh: fetchOptInStatus,
    currentAccountGroupFullyOptedIn,
    currentAccountGroupFullySupported,
  };
};
