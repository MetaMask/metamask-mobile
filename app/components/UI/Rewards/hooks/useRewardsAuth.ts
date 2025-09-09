import { useCallback, useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectSelectedInternalAccount } from '../../../../selectors/accountsController';
import { handleRewardsErrorMessage } from '../utils';
import Engine from '../../../../core/Engine';
import { getSubscriptionToken } from '../../../../core/Engine/controllers/rewards-controller/utils/multi-subscription-token-vault';
import Logger from '../../../../util/Logger';
import {
  selectRewardsSubscriptionId,
  selectRewardsActiveAccountId,
} from '../../../../selectors/rewards';
import {
  CaipAccountId,
  parseCaipChainId,
  toCaipAccountId,
} from '@metamask/utils';

export interface UseRewardsAuthResult {
  /**
   * Function to initiate the optin process
   */
  optin: ({ referralCode }: { referralCode?: string }) => Promise<void>;
  /**
   * Current subscription id
   */
  subscriptionId: string | null;

  /**
   * Loading state for authentication operation
   */
  hasAccountedOptedIn: boolean | 'pending' | 'error';
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

/**
 * Custom hook to manage rewards authentication (optin/logout)
 * Uses the RewardsController and RewardsDataService for authentication operations
 */
export const useRewardsAuth = (): UseRewardsAuthResult => {
  const account = useSelector(selectSelectedInternalAccount);
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const rewardsActiveAccountId = useSelector(selectRewardsActiveAccountId);
  const [optinError, setOptinError] = useState<string | null>(null);
  const [optinLoading, setOptinLoading] = useState<boolean>(false);
  const [hasAccountedOptedIn, setHasAccountOptedIn] = useState<
    boolean | 'pending' | 'error'
  >('pending');

  const accountId = useMemo(() => {
    let result: CaipAccountId | null = null;
    try {
      const [scope] = account?.scopes || [];
      if (!scope) {
        return null;
      }
      const { namespace, reference } = parseCaipChainId(scope);
      result = toCaipAccountId(namespace, reference, account?.address || '');
    } catch (error) {
      result = null;
    }
    return result;
  }, [account]);

  // Reusable function to check authentication state
  const checkAuthState = useCallback(async () => {
    setHasAccountOptedIn('pending');

    if (!accountId) {
      return;
    }

    try {
      if (accountId !== rewardsActiveAccountId) {
        // Give controller time to update the active account
        return;
      }

      let tokenValid = false;
      if (subscriptionId) {
        const tokenResult = await getSubscriptionToken(subscriptionId);
        tokenValid = tokenResult.success && !!tokenResult.token;
      }

      if (tokenValid) {
        setHasAccountOptedIn(true);
      } else {
        setHasAccountOptedIn(false);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      Logger.log(
        'Rewards (useRewardsAuth): Failed to check auth state',
        errorMessage,
      );
      setHasAccountOptedIn('error');
    }
  }, [accountId, rewardsActiveAccountId, subscriptionId]);

  const handleOptin = useCallback(
    async ({ referralCode }: { referralCode?: string }) => {
      if (!account) {
        return;
      }

      try {
        setOptinLoading(true);
        setOptinError(null);

        await Engine.controllerMessenger.call(
          'RewardsController:optIn',
          account,
          referralCode || undefined,
        );
      } catch (error) {
        const errorMessage = handleRewardsErrorMessage(error);
        setOptinError(errorMessage);
      } finally {
        setOptinLoading(false);
      }
    },
    [account],
  );

  const clearOptinError = useCallback(() => setOptinError(null), []);

  // Check authentication state when address changes
  useEffect(() => {
    checkAuthState();
  }, [checkAuthState, account]);

  return {
    optin: handleOptin,
    subscriptionId: subscriptionId || null,
    hasAccountedOptedIn,
    optinLoading,
    optinError,
    clearOptinError,
  };
};
