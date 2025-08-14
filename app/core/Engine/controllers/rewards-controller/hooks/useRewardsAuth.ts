import { useCallback, useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { toHex } from '@metamask/controller-utils';

import {
  useGenerateChallengeMutation,
  useLoginMutation,
  useLogoutMutation,
} from '../services';
import { selectSelectedInternalAccountAddress } from '../../../../../selectors/accountsController';
import { handleRewardsErrorMessage } from '../../../../../util/rewards';
import { getSubscriptionToken } from '../utils/MultiSubscriptionTokenVault';
import Engine from '../../../../Engine';

export const useRewardsAuth = ({
  onLoginSuccess,
}: {
  onLoginSuccess?: () => void;
} = {}) => {
  const address = useSelector(selectSelectedInternalAccountAddress);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);

  const [generateChallenge] = useGenerateChallengeMutation();
  const [login] = useLoginMutation();
  const [logout, logoutResult] = useLogoutMutation();

  const handleLogin = useCallback(async () => {
    if (!address) return;

    try {
      setLoginLoading(true);
      setLoginError(null);
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

      await login({ challengeId: challengeResponse.id, signature });
      onLoginSuccess?.();
    } catch (error) {
      setLoginError(handleRewardsErrorMessage(error));
    } finally {
      setLoginLoading(false);
    }
  }, [address, generateChallenge, login, onLoginSuccess]);

  const handleLogout = useCallback(async () => {
    logout();
    await AsyncStorage.clear();
    Engine.context.RewardsController.setDevOnlyLoginAddress(null);
  }, [logout]);

  const clearLoginError = useCallback(() => setLoginError(null), []);

  // Check if we have a valid subscription token for current account
  useEffect(() => {
    const checkAuthState = async () => {
      if (!address) {
        setIsAuthenticated(false);
        setIsAuthenticating(false);
        return;
      }

      setIsAuthenticating(true);
      try {
        const rewardsController = Engine.context.RewardsController;
        const subscriptionId =
          rewardsController.getSubscriptionIdForAccount(address);

        if (subscriptionId) {
          const tokenResult = await getSubscriptionToken(subscriptionId);
          setIsAuthenticated(tokenResult.success && !!tokenResult.token);
        } else {
          setIsAuthenticated(false);
        }
      } catch {
        setIsAuthenticated(false);
      } finally {
        setIsAuthenticating(false);
      }
    };

    checkAuthState();
  }, [address]); // Re-check when account or subscription changes

  return {
    login: handleLogin,
    logout: handleLogout,
    isLoggedIn: isAuthenticated,
    isLoading: loginLoading || logoutResult.isLoading || isAuthenticating,
    loginError,
    clearLoginError,
  };
};
