import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  selectAccountGroupsByWallet,
  selectSelectedAccountGroup,
} from '../../../../selectors/multichainAccounts/accountTreeController';
import { selectInternalAccountsById } from '../../../../selectors/accountsController';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { AccountWalletObject } from '@metamask/account-tree-controller';
import Engine from '../../../../core/Engine';
import { OptInStatusDto } from '../../../../core/Engine/controllers/rewards-controller/types';
import Logger from '../../../../util/Logger';
import { some } from 'lodash';
import { AccountGroupId } from '@metamask/account-api';
import { useInvalidateByRewardEvents } from './useInvalidateByRewardEvents';
import { UserProfileProperty } from '../../../../util/metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { useAccountsOperationsLoadingStates } from '../../../../util/accounts/useAccountsOperationsLoadingStates';
import { selectRewardsActiveAccountSubscriptionId } from '../../../../selectors/rewards';
import { useMetrics } from '../../../hooks/useMetrics';

// Helper function to enrich accounts with opt-in status
const enrichAccountsWithOptInStatus = (
  accountIds: readonly string[],
  accountOis: Record<
    string,
    { account: InternalAccount; ois: boolean; subscriptionId: string | null }
  >,
): AccountWithOptInStatus[] =>
  accountIds
    .filter((accountId) => accountOis[accountId]) // Only include supported accounts
    .map((accountId) => ({
      ...(accountOis[accountId]?.account || {}),
      hasOptedIn: accountOis[accountId]?.ois || false,
      subscriptionId: accountOis[accountId]?.subscriptionId || null,
    }));

// Helper function to check for subscription conflicts
const hasSubscriptionConflict = (
  accounts: AccountWithOptInStatus[],
  accountOis: Record<
    string,
    { account: InternalAccount; ois: boolean; subscriptionId: string | null }
  >,
  activeAccountSubscriptionId: string,
): boolean =>
  accounts.some((account) => {
    if (!account.hasOptedIn) return false;
    return (
      accountOis[account.id]?.subscriptionId !== activeAccountSubscriptionId
    );
  });

// Helper function to build account group with opt-in status
const buildAccountGroupWithOptInStatus = (
  accountGroup: {
    id: AccountGroupId;
    accounts: readonly string[];
    metadata: { name: string };
  },
  accountOis: Record<
    string,
    { account: InternalAccount; ois: boolean; subscriptionId: string | null }
  >,
  allAccountsById: Record<string, InternalAccount>,
  activeAccountSubscriptionId?: string,
): AccountGroupWithOptInStatus | null => {
  const groupAccountEnriched = enrichAccountsWithOptInStatus(
    accountGroup.accounts,
    accountOis,
  );

  // Skip groups with conflicting subscriptions
  if (
    activeAccountSubscriptionId &&
    groupAccountEnriched.some((account) => account.hasOptedIn) &&
    hasSubscriptionConflict(
      groupAccountEnriched,
      accountOis,
      activeAccountSubscriptionId,
    )
  ) {
    return null;
  }

  if (groupAccountEnriched.length === 0) {
    return null;
  }

  // Find unsupported accounts (accounts that exist in the group but not in accountOis)
  const unsupportedAccounts = accountGroup.accounts
    .filter((accountId) => !accountOis[accountId])
    .map((accountId) => allAccountsById[accountId])
    .filter((account): account is InternalAccount => account !== undefined);

  return {
    id: accountGroup.id,
    name: accountGroup.metadata.name,
    optedInAccounts: groupAccountEnriched.filter(
      (account) => account.hasOptedIn,
    ),
    optedOutAccounts: groupAccountEnriched.filter(
      (account) => !account.hasOptedIn,
    ),
    unsupportedAccounts,
  };
};

// Main helper function to build wallet structure efficiently
const buildWalletStructureWithOptInStatus = (
  accountGroupsByWallet: readonly {
    wallet: AccountWalletObject;
    data: readonly {
      id: AccountGroupId;
      accounts: readonly string[];
      metadata: { name: string };
    }[];
  }[],
  accountOis: Record<
    string,
    { account: InternalAccount; ois: boolean; subscriptionId: string | null }
  >,
  allAccountsById: Record<string, InternalAccount>,
  activeAccountSubscriptionId?: string,
): WalletWithAccountGroupsWithOptInStatus[] =>
  accountGroupsByWallet
    .map((walletData) => {
      const groups = walletData.data
        .map((accountGroup) =>
          buildAccountGroupWithOptInStatus(
            accountGroup,
            accountOis,
            allAccountsById,
            activeAccountSubscriptionId,
          ),
        )
        .filter(
          (group): group is AccountGroupWithOptInStatus => group !== null,
        );

      return groups.length > 0
        ? {
            wallet: walletData.wallet,
            groups,
          }
        : null;
    })
    .filter(
      (wallet): wallet is WalletWithAccountGroupsWithOptInStatus =>
        wallet !== null,
    );

export interface AccountWithOptInStatus extends InternalAccount {
  hasOptedIn: boolean;
}

export interface AccountGroupWithOptInStatus {
  id: AccountGroupId;
  name: string;
  optedInAccounts: AccountWithOptInStatus[];
  optedOutAccounts: AccountWithOptInStatus[];
  unsupportedAccounts: InternalAccount[];
}

export interface WalletWithAccountGroupsWithOptInStatus {
  wallet: AccountWalletObject;
  groups: AccountGroupWithOptInStatus[];
}

export type CurrentAccountGroupOptedInStatus =
  | 'fullyOptedIn'
  | 'partiallyOptedIn'
  | 'notOptedIn';

interface useRewardOptinSummaryResult {
  bySelectedAccountGroup: AccountGroupWithOptInStatus | null;
  byWallet: WalletWithAccountGroupsWithOptInStatus[];
  isLoading: boolean;
  hasError: boolean;
  refresh: () => Promise<void>;
  currentAccountGroupOptedInStatus: CurrentAccountGroupOptedInStatus | null;
  currentAccountGroupPartiallySupported: boolean | null;
}

export const useRewardOptinSummary = (): useRewardOptinSummaryResult => {
  const selectedAccountGroup = useSelector(selectSelectedAccountGroup);
  const activeAccountSubscriptionId = useSelector(
    selectRewardsActiveAccountSubscriptionId,
  );
  const accountGroupsByWallet = useSelector(selectAccountGroupsByWallet);
  const internalAccountsById = useSelector(selectInternalAccountsById);
  const [byWallet, setByWallet] = useState<
    WalletWithAccountGroupsWithOptInStatus[] | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [
    currentAccountGroupOptedInStatus,
    setCurrentAccountGroupOptedInStatus,
  ] = useState<CurrentAccountGroupOptedInStatus | null>(null);
  const [
    currentAccountGroupPartiallySupported,
    setCurrentAccountGroupPartiallySupported,
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
      !selectedAccountGroup?.id ||
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

      // Get opt in status for supported accounts
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
      const accountOis = supportedAccounts.reduce<
        Record<
          string,
          {
            account: InternalAccount;
            ois: boolean;
            subscriptionId: string | null;
          }
        >
      >((acc, account, index) => {
        acc[account.id] = {
          account,
          ois: response.ois[index],
          subscriptionId: response.sids[index],
        };
        return acc;
      }, {});

      // Construct byWallet structure using efficient mapping functions
      const walletStructure = buildWalletStructureWithOptInStatus(
        debouncedAccountGroupsByWallet || [],
        accountOis,
        debouncedInternalAccountsById,
        activeAccountSubscriptionId || undefined,
      );

      // Calculate total opted-in accounts efficiently
      const totalOptedInAccounts = walletStructure.reduce(
        (total, wallet) =>
          total +
          wallet.groups.reduce(
            (groupTotal, group) => groupTotal + group.optedInAccounts.length,
            0,
          ),
        0,
      );

      setByWallet(walletStructure);

      // Update user traits with the count of reward-enabled accounts
      if (!hasTrackedLinkedAccountsRef.current) {
        hasTrackedLinkedAccountsRef.current = true;

        const traits = {
          [UserProfileProperty.REWARD_ENABLED_ACCOUNTS_COUNT]:
            totalOptedInAccounts,
        };

        Logger.log(
          'Triggering update of user traits for reward-enabled accounts',
          traits,
        );

        await addTraitsToUser(traits);
      }
    } catch (error) {
      Logger.log('useRewardOptinSummary: Failed to fetch opt-in status', error);
      setHasError(true);
      setByWallet(null);
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }, [
    flattenedAccounts,
    selectedAccountGroup?.id,
    debouncedAccountGroupsByWallet,
    debouncedInternalAccountsById,
    activeAccountSubscriptionId,
    addTraitsToUser,
  ]);

  useEffect(() => {
    // Update computed values based on current account group
    if (selectedAccountGroup?.id && byWallet) {
      // Find the selected account group in the byWallet structure
      let selectedGroupAccounts: AccountWithOptInStatus[] = [];
      const selectedGroup = byWallet
        .flatMap((wallet) => wallet.groups ?? [])
        .find((group) => group.id === selectedAccountGroup?.id);
      if (selectedGroup) {
        selectedGroupAccounts = [
          ...selectedGroup.optedInAccounts,
          ...selectedGroup.optedOutAccounts,
        ];
      }

      if (selectedGroupAccounts.length > 0) {
        // Check if all accounts in the selected group are opted in
        const optedInCount = selectedGroupAccounts.filter(
          (account) => account.hasOptedIn,
        ).length;
        const totalCount = selectedGroupAccounts.length;

        setCurrentAccountGroupOptedInStatus(
          optedInCount === totalCount
            ? 'fullyOptedIn'
            : optedInCount > 0
              ? 'partiallyOptedIn'
              : 'notOptedIn',
        );

        // Check if all accounts in the selected group are supported
        // Support is determined by checking if the account can opt in to rewards
        const partiallySupported = some(selectedGroupAccounts, (account) => {
          try {
            return Engine.controllerMessenger.call(
              'RewardsController:isOptInSupported',
              account,
            );
          } catch (error) {
            return false;
          }
        });
        setCurrentAccountGroupPartiallySupported(partiallySupported);
      } else {
        setCurrentAccountGroupOptedInStatus(null);
        setCurrentAccountGroupPartiallySupported(null);
      }
    } else {
      setCurrentAccountGroupOptedInStatus(null);
      setCurrentAccountGroupPartiallySupported(null);
    }
  }, [byWallet, selectedAccountGroup?.id]);

  const refresh = useCallback(() => {
    setIsLoading(true);
    setHasError(false);
    setByWallet(null);
    setCurrentAccountGroupOptedInStatus(null);
    setCurrentAccountGroupPartiallySupported(null);
    fetchOptInStatus();
  }, [fetchOptInStatus]);

  useInvalidateByRewardEvents(['RewardsController:accountLinked'], refresh);

  // Fetch opt-in status when accounts change or enabled changes
  useEffect(() => {
    if (selectedAccountGroup?.id) {
      fetchOptInStatus();
    }
  }, [fetchOptInStatus, selectedAccountGroup?.id]);

  // Create selected account group with opt-in status derived from byWallet
  const bySelectedAccountGroup = useMemo(() => {
    if (!selectedAccountGroup?.id || !byWallet) return null;

    // Find the selected account group in the byWallet structure
    const selectedGroup = byWallet
      .flatMap((wallet) => wallet.groups ?? [])
      .find((group) => group.id === selectedAccountGroup.id);
    if (selectedGroup) {
      return selectedGroup;
    }
    return null;
  }, [byWallet, selectedAccountGroup?.id]);

  return {
    bySelectedAccountGroup,
    byWallet: byWallet || [],
    isLoading: isLoading && !byWallet?.length,
    hasError,
    refresh: fetchOptInStatus,
    currentAccountGroupOptedInStatus,
    currentAccountGroupPartiallySupported,
  };
};
