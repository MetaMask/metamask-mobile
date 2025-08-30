import { useCallback, useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { toHex } from '@metamask/controller-utils';
import { selectSelectedInternalAccountAddress } from '../../../../selectors/accountsController';
import { selectRewardsSubscription } from '../../../../selectors/rewardscontroller';
import { handleRewardsErrorMessage } from '../utils';
import Engine from '../../../../core/Engine';
import { getSubscriptionToken } from '../../../../core/Engine/controllers/rewards-controller/utils/multi-subscription-token-vault';
import type { SubscriptionDto } from '../../../../core/Engine/controllers/rewards-controller/types';
import Logger from '../../../../util/Logger';

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
   * Current account address
   */
  currentAccount: string | undefined;
  /**
   * Current subscription data
   */
  subscription: SubscriptionDto | null;
  /**
   * Whether the user is opted in (authenticated)
   */
  isOptIn: boolean;
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
  const address = useSelector(selectSelectedInternalAccountAddress);
  const subscription = useSelector(selectRewardsSubscription);
  const [optinError, setOptinError] = useState<string | null>(null);
  const [optinLoading, setOptinLoading] = useState<boolean>(false);
  const [logoutLoading, setLogoutLoading] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);

  // Reusable function to check authentication state
  const checkAuthState = useCallback(async () => {
    Logger.log('Rewards: Checking auth state');
    if (!address) {
      setIsAuthenticated(false);
      setIsAuthenticating(false);
      return;
    }
    setIsAuthenticating(true);
    try {
      const currentSubscriptionId = subscription?.id;

      if (currentSubscriptionId) {
        const tokenResult = await getSubscriptionToken(currentSubscriptionId);
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
  }, [address, subscription?.id]);

  const handleOptin = useCallback(
    async ({ referralCode }: { referralCode?: string }) => {
      if (!address) {
        Logger.log('Rewards: No address available for optin');
        return;
      }

      try {
        setOptinLoading(true);
        setOptinError(null);

        Logger.log('Rewards: Starting optin process', {
          address,
        });

        const challengeResponse = await Engine.controllerMessenger.call(
          'RewardsDataService:generateChallenge',
          {
            address,
          },
        );

        // Try different encoding approaches to handle potential character issues
        let hexMessage;
        try {
          // First try: direct toHex conversion
          hexMessage = toHex(challengeResponse.message);
        } catch (error) {
          // Fallback: use Buffer to convert to hex if toHex fails
          hexMessage =
            '0x' +
            Buffer.from(challengeResponse.message, 'utf8').toString('hex');
        }

        // Use KeyringController for silent signature
        const signature =
          await Engine.context.KeyringController.signPersonalMessage({
            data: hexMessage,
            from: address,
          });

        Logger.log('Rewards: Submitting optin with signature...');
        const optinResponse = await Engine.controllerMessenger.call(
          'RewardsDataService:optin',
          {
            challengeId: challengeResponse.id,
            signature,
            referralCode,
          },
        );

        Logger.log('Rewards: Optin successful, updating controller state...');
        await Engine.controllerMessenger.call(
          'RewardsController:updateStateWithOptinResponse',
          address,
          optinResponse,
        );
      } catch (error) {
        const errorMessage = handleRewardsErrorMessage(error);
        Logger.log('Rewards: Optin failed', { errorMessage });
        setOptinError(errorMessage);
      } finally {
        setOptinLoading(false);
      }
    },
    [address],
  );

  const handleLogout = useCallback(async () => {
    try {
      setLogoutLoading(true);

      const subscriptionId = subscription?.id || '';
      await Engine.controllerMessenger.call(
        'RewardsDataService:logout',
        subscriptionId,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      Logger.log('Rewards: Logout failed', errorMessage);
    } finally {
      setLogoutLoading(false);
    }
  }, [subscription?.id]);

  const clearOptinError = useCallback(() => setOptinError(null), []);

  // Check authentication state when address changes
  useEffect(() => {
    checkAuthState();
  }, [checkAuthState, address]);

  return {
    optin: handleOptin,
    logout: handleLogout,
    currentAccount: address,
    subscription: subscription || null,
    isOptIn: isAuthenticated,
    isLoading: optinLoading || logoutLoading || isAuthenticating,
    optinError,
    clearOptinError,
  };
};
