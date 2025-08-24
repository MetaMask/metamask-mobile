import { useCallback, useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { toHex } from '@metamask/controller-utils';

import {
  useGenerateChallengeMutation,
  useOptinMutation,
  useLogoutMutation,
} from '../services';
import { selectSelectedInternalAccountAddress } from '../../../../../selectors/accountsController';
import { selectRewardsSubscription } from '../../../../../selectors/rewardscontroller';
import { handleRewardsErrorMessage } from '../../../../../util/rewards';
import Engine from '../../../../Engine';
import Logger from '../../../../../util/Logger';
import { getSubscriptionToken } from '../utils/multi-subscription-token-vault';

export const useRewardsAuth = () => {
  const address = useSelector(selectSelectedInternalAccountAddress);
  const subscription = useSelector(selectRewardsSubscription);
  const [optinError, setOptinError] = useState<string | null>(null);
  const [optinLoading, setOptinLoading] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [generateChallenge] = useGenerateChallengeMutation();
  const [optin] = useOptinMutation();
  const [logout, logoutResult] = useLogoutMutation();

  // Reusable function to check authentication state
  const checkAuthState = useCallback(async () => {
    Logger.log('RewardsController: Checking auth state');
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
        Logger.log('RewardsController: tokenResult', tokenResult);
        setIsAuthenticated(tokenResult.success && !!tokenResult.token);
      } else {
        setIsAuthenticated(false);
      }
    } catch {
      setIsAuthenticated(false);
    } finally {
      setIsAuthenticating(false);
    }
  }, [address, subscription?.id]);

  const handleOptin = useCallback(async () => {
    if (!address) return;

    try {
      setOptinLoading(true);
      setOptinError(null);
      const challengeResponse = await generateChallenge({ address }).unwrap();

      // Try different encoding approaches to handle potential character issues
      let hexMessage;
      try {
        // First try: direct toHex conversion
        hexMessage = toHex(challengeResponse.message);
      } catch (error) {
        // Fallback: use Buffer to convert to hex if toHex fails
        hexMessage =
          '0x' + Buffer.from(challengeResponse.message, 'utf8').toString('hex');
      }

      // Use KeyringController for silent signature
      const signature =
        await Engine.context.KeyringController.signPersonalMessage({
          data: hexMessage,
          from: address,
        });

      await optin({ challengeId: challengeResponse.id, signature });
      checkAuthState();
    } catch (error) {
      setOptinError(handleRewardsErrorMessage(error));
    } finally {
      setOptinLoading(false);
    }
  }, [address, checkAuthState, generateChallenge, optin]);

  const handleLogout = useCallback(async () => {
    logout();
  }, [logout]);

  const clearOptinError = useCallback(() => setOptinError(null), []);

  // Check authentication state when address changes
  useEffect(() => {
    checkAuthState();
  }, [checkAuthState, address]);

  return {
    optin: handleOptin,
    logout: handleLogout,
    currentAccount: address,
    subscription,
    isOptIn: isAuthenticated,
    isLoading: optinLoading || logoutResult.isLoading || isAuthenticating,
    optinError,
    clearOptinError,
  };
};
