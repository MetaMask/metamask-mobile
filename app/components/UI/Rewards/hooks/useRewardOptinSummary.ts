import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { selectRewardsActiveAccountSubscriptionId } from '../../../../selectors/rewards';
import { convertInternalAccountToCaipAccountId } from '../utils';
import { useMetrics } from '../../../hooks/useMetrics';
import { UserProfileProperty } from '../../../../util/metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';

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
  currentAccountSupported: boolean | null;
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
  const activeAccountSubscriptionId = useSelector(
    selectRewardsActiveAccountSubscriptionId,
  );
  const { addTraitsToUser } = useMetrics();
  const hasTrackedLinkedAccountsRef = useRef(false);

  const [optedInAccounts, setOptedInAccounts] = useState<
    AccountWithOptInStatus[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [currentAccountOptedIn, setCurrentAccountOptedIn] = useState<
    boolean | null
  >(null);
  const [currentAccountSupported, setCurrentAccountSupported] = useState<
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
      setIsLoading(enabled);
      return;
    }
    if (isLoadingRef.current) {
      return;
    }
    isLoadingRef.current = true;

    try {
      setIsLoading(true);
      setHasError(false);
      setCurrentAccountOptedIn(null);
      setCurrentAccountSupported(null);
      const supportedAccounts: InternalAccount[] =
        accounts?.filter((account: InternalAccount) =>
          Engine.controllerMessenger.call(
            'RewardsController:isOptInSupported',
            account,
          ),
        ) || [];

      const response: OptInStatusDto = await Engine.controllerMessenger.call(
        'RewardsController:getOptInStatus',
        { addresses: supportedAccounts.map((account) => account.address) },
      );

      // Map all accounts with their opt-in status
      const accountsWithStatus: AccountWithOptInStatus[] = [];
      let selectedAccountStatus = false;

      for (let i = 0; i < supportedAccounts.length; i++) {
        const account = supportedAccounts[i];
        const hasOptedIn = response.ois[i] || false;

        accountsWithStatus.push({ ...account, hasOptedIn });

        // Check if this is the current selected account
        if (selectedAccount && account.address === selectedAccount.address) {
          selectedAccountStatus = hasOptedIn;
        }
      }

      setOptedInAccounts(accountsWithStatus);
      setCurrentAccountOptedIn(selectedAccountStatus);
      setCurrentAccountSupported(
        supportedAccounts.some(
          (account) => account.address === selectedAccount?.address,
        ),
      );
    } catch (error) {
      Logger.log('useRewardOptinSummary: Failed to fetch opt-in status', error);
      setHasError(true);
      setCurrentAccountSupported(null);
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

  const coercedLinkedAccounts = useMemo(() => {
    if (activeAccountSubscriptionId) {
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
      return accountsForSameSubscription;
    }
    return linkedAccounts;
  }, [activeAccountSubscriptionId, linkedAccounts]);

  // Update user traits with the count of reward-enabled accounts
  useEffect(() => {
    const updateUserTraits = async () => {
      const traits = {
        [UserProfileProperty.REWARD_ENABLED_ACCOUNTS_COUNT]:
          coercedLinkedAccounts.length,
      };
      Logger.log(
        'Triggering update of user traits for reward-enabled accounts',
        traits,
      );
      await addTraitsToUser(traits);
    };

    // Only track once per session when we have the data
    if (!hasTrackedLinkedAccountsRef.current && !isLoading) {
      hasTrackedLinkedAccountsRef.current = true;
      updateUserTraits();
    }
  }, [coercedLinkedAccounts, addTraitsToUser, isLoading]);

  return {
    linkedAccounts: coercedLinkedAccounts,
    unlinkedAccounts,
    isLoading: isLoading && !optedInAccounts.length, // prevent flickering if accounts are being populated via i.e. profile sync
    hasError,
    refresh: fetchOptInStatus,
    currentAccountOptedIn,
    currentAccountSupported,
  };
};
