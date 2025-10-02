import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  selectInternalAccounts,
  selectSelectedInternalAccount,
} from '../../../../selectors/accountsController';
import { InternalAccount } from '@metamask/keyring-internal-api';
import Engine from '../../../../core/Engine';
import { OptInStatusDto } from '../../../../core/Engine/controllers/rewards-controller/types';
import Logger from '../../../../util/Logger';

interface AccountWithOptInStatus extends InternalAccount {
  hasOptedIn: boolean;
}

interface useRewardOptinSummaryResult {
  linkedAccounts: AccountWithOptInStatus[];
  unlinkedAccounts: AccountWithOptInStatus[];
  isLoading: boolean;
  hasError: boolean;
  refresh: () => Promise<void>;
  currentAccountOptedIn: boolean | null;
}

interface useRewardOptinSummaryOptions {
  enabled?: boolean;
}

export const useRewardOptinSummary = (
  options: useRewardOptinSummaryOptions = {},
): useRewardOptinSummaryResult => {
  const { enabled = true } = options;
  const internalAccounts = useSelector(selectInternalAccounts);
  const selectedAccount = useSelector(selectSelectedInternalAccount);

  const [optedInAccounts, setOptedInAccounts] = useState<
    AccountWithOptInStatus[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [currentAccountOptedIn, setCurrentAccountOptedIn] = useState<
    boolean | null
  >(null);

  // Memoize accounts to avoid unnecessary re-renders
  const accounts = useMemo(() => internalAccounts || [], [internalAccounts]);

  // Fetch opt-in status for all accounts
  const fetchOptInStatus = useCallback(async () => {
    if (!enabled || !accounts.length) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setHasError(false);
      const addresses = accounts.map((account) => account.address);

      const response: OptInStatusDto = await Engine.controllerMessenger.call(
        'RewardsController:getOptInStatus',
        { addresses },
      );

      // Map all accounts with their opt-in status
      const accountsWithStatus: AccountWithOptInStatus[] = [];
      let selectedAccountStatus = false;

      for (let i = 0; i < accounts.length; i++) {
        const account = accounts[i];
        const hasOptedIn = response.ois[i] || false;

        accountsWithStatus.push({ ...account, hasOptedIn });

        // Check if this is the current selected account
        if (selectedAccount && account.address === selectedAccount.address) {
          selectedAccountStatus = hasOptedIn;
        }
      }

      setOptedInAccounts(accountsWithStatus);
      setCurrentAccountOptedIn(selectedAccountStatus);
    } catch (error) {
      Logger.log('useRewardOptinSummary: Failed to fetch opt-in status', error);
      setHasError(true);
      setOptedInAccounts([]);
      setCurrentAccountOptedIn(null);
    } finally {
      setIsLoading(false);
    }
  }, [accounts, selectedAccount, enabled]);

  // Fetch opt-in status when accounts change or enabled changes
  useEffect(() => {
    if (enabled) {
      fetchOptInStatus();
    }
  }, [fetchOptInStatus, enabled]);

  // Separate accounts into linked and unlinked
  const { linkedAccounts, unlinkedAccounts } = useMemo(() => {
    const linked = optedInAccounts.filter((account) => account.hasOptedIn);
    const unlinked = optedInAccounts.filter((account) => !account.hasOptedIn);
    return { linkedAccounts: linked, unlinkedAccounts: unlinked };
  }, [optedInAccounts]);

  return {
    linkedAccounts,
    unlinkedAccounts,
    isLoading,
    hasError,
    refresh: fetchOptInStatus,
    currentAccountOptedIn,
  };
};
