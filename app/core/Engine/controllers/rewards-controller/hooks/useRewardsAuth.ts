import { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { toHex } from '@metamask/controller-utils';

import {
  useGenerateChallengeMutation,
  useLoginMutation,
  useLogoutMutation,
} from '../services';
import { useRewardsSubscription } from './useRewardsSubscription';
import { selectSelectedInternalAccountAddress } from '../../../../../selectors/accountsController';
import { handleRewardsErrorMessage } from '../../../../../util/rewards';
import Engine from '../../../../Engine';

export const REWARDS_SIGNUP_PREFIX = 'metaMaskRewardsSignup';

export const useRewardsAuth = ({
  onLoginSuccess,
}: {
  onLoginSuccess?: () => void;
} = {}) => {
  const address = useSelector(selectSelectedInternalAccountAddress);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState<boolean>(false);

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
      await AsyncStorage.setItem(`${REWARDS_SIGNUP_PREFIX}-${address}`, 'true');
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

  const { isLoading: subscriptionIsLoading, isSuccess: subscriptionIsSuccess } =
    useRewardsSubscription();

  return {
    login: handleLogin,
    logout: handleLogout,
    isLoggedIn: subscriptionIsSuccess,
    isLoading: loginLoading || logoutResult.isLoading || subscriptionIsLoading,
    loginError,
    clearLoginError,
  };
};
