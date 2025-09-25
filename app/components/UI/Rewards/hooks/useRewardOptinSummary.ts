import { useCallback, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  selectInternalAccounts,
  selectSelectedInternalAccount,
} from '../../../../selectors/accountsController';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { InternalAccount } from '@metamask/keyring-internal-api';
import Engine from '../../../../core/Engine';
import { OptInStatusDto } from '../../../../core/Engine/controllers/rewards-controller/types';
import Logger from '../../../../util/Logger';
import { useFocusEffect } from '@react-navigation/native';
import { useAccountsOperationsLoadingStates } from '../../../../util/accounts/useAccountsOperationsLoadingStates';

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
  const isLoadingRef = useRef(false);
  // Check if any account operations are loading
  const { isAccountSyncingInProgress } = useAccountsOperationsLoadingStates();

  // Debounce accounts for 30 seconds to avoid excessive re-renders (i.e. profile sync)
  const accounts = useDebouncedValue(
    internalAccounts,
    isAccountSyncingInProgress ? 10000 : 0,
  );

  // Fetch opt-in status for all accounts
  const fetchOptInStatus = useCallback(async (): Promise<void> => {
    if (!enabled || !accounts.length) {
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
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }, [accounts, selectedAccount, enabled]);

  // Fetch opt-in status when accounts change or enabled changes
  useFocusEffect(
    useCallback(() => {
      fetchOptInStatus();
    }, [fetchOptInStatus]),
  );

  // Separate accounts into linked and unlinked
  const { linkedAccounts, unlinkedAccounts } = useMemo(() => {
    const linked = optedInAccounts.filter((account) => account.hasOptedIn);
    const unlinked = optedInAccounts.filter((account) => !account.hasOptedIn);
    return { linkedAccounts: linked, unlinkedAccounts: unlinked };
  }, [optedInAccounts]);

  return {
    linkedAccounts,
    unlinkedAccounts,
    isLoading: isLoading && !optedInAccounts.length, // prevent flickering if accounts are being populated via i.e. profile sync
    hasError,
    refresh: fetchOptInStatus,
    currentAccountOptedIn,
  };
};
