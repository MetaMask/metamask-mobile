import { useCallback, useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectSelectedInternalAccount } from '../../../../selectors/accountsController';
import { handleRewardsErrorMessage } from '../utils';
import Engine from '../../../../core/Engine';
import { getSubscriptionToken } from '../../../../core/Engine/controllers/rewards-controller/utils/multi-subscription-token-vault';
import Logger from '../../../../util/Logger';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';

export interface UseRewardsAuthResult {
  /**
   * Function to initiate the optin process
   */
  optin: ({ referralCode }: { referralCode?: string }) => Promise<void>;
  /**
   * Function to logout the current user
   */
  logout: () => Promise<void>;
  /**
   * Current account
   */
  currentAccount: InternalAccount | undefined;
  /**
   * Current subscription id
   */
  subscriptionId: string | null;
  /**
   * Whether the user is opted in (authenticated)
   */
  hasAccountedOptedIntoRewards: boolean;
  /**
   * Loading state for any ongoing operations
   */
  isLoading: boolean;
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
  const [optinError, setOptinError] = useState<string | null>(null);
  const [optinLoading, setOptinLoading] = useState<boolean>(false);
  const [logoutLoading, setLogoutLoading] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);

  // Reusable function to check authentication state
  const checkAuthState = useCallback(async () => {
    Logger.log('Rewards: Checking auth state');
    if (!account) {
      setIsAuthenticated(false);
      setIsAuthenticating(false);
      return;
    }
    setIsAuthenticating(true);
    try {
      if (subscriptionId) {
        const tokenResult = await getSubscriptionToken(subscriptionId);
        Logger.log('Rewards: Token result', tokenResult);
        setIsAuthenticated(tokenResult.success && !!tokenResult.token);
      } else {
        setIsAuthenticated(false);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      Logger.log('Rewards: Failed to check auth state', errorMessage);
      setIsAuthenticated(false);
    } finally {
      setIsAuthenticating(false);
    }
  }, [account, subscriptionId]);

  const handleOptin = useCallback(
    async ({ referralCode }: { referralCode?: string }) => {
      if (!account) {
        Logger.log('Rewards: No account available for optin');
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
        Logger.log('Rewards: Optin failed', { errorMessage });
        setOptinError(errorMessage);
      } finally {
        setOptinLoading(false);
      }
    },
    [account],
  );

  const handleLogout = useCallback(async () => {
    try {
      setLogoutLoading(true);

      if (subscriptionId) {
        await Engine.controllerMessenger.call('RewardsController:logout');
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      Logger.log('Rewards: Logout failed', errorMessage);
    } finally {
      setLogoutLoading(false);
    }
  }, [subscriptionId]);

  const clearOptinError = useCallback(() => setOptinError(null), []);

  // Check authentication state when address changes
  useEffect(() => {
    checkAuthState();
  }, [checkAuthState, account]);

  return {
    optin: handleOptin,
    logout: handleLogout,
    currentAccount: account,
    subscriptionId: subscriptionId || null,
    hasAccountedOptedIntoRewards: isAuthenticated,
    isLoading: optinLoading || logoutLoading || isAuthenticating,
    optinError,
    clearOptinError,
  };
};
