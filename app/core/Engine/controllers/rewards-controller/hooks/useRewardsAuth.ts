import { useCallback } from 'react';
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
import Engine from '../../../../Engine';

export const REWARDS_SIGNUP_PREFIX = 'metaMaskRewardsSignup';

export const useRewardsAuth = () => {
  const address = useSelector(selectSelectedInternalAccountAddress);

  const [generateChallenge, generateChallengeResult] =
    useGenerateChallengeMutation();
  const [login, loginResult] = useLoginMutation();
  const [logout, logoutResult] = useLogoutMutation();

  const handleLogin = useCallback(async () => {
    try {
      if (!address) {
        // eslint-disable-next-line no-console
        console.error('User is not connected to wallet');
        return;
      }
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

      await login({
        challengeId: challengeResponse.id,
        signature,
      });
      // eslint-disable-next-line no-console
      console.log('Login successful');
      await AsyncStorage.setItem(`${REWARDS_SIGNUP_PREFIX}-${address}`, 'true');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error logging in:', error);
    }
  }, [address, generateChallenge, login]);

  const handleLogout = useCallback(() => {
    logout();
  }, [logout]);

  const { subscription, isSuccess: subscriptionIsSuccess } =
    useRewardsSubscription();

  return {
    login: handleLogin,
    logout: handleLogout,
    isLoggedIn: !!subscription && subscriptionIsSuccess,
    isLoading:
      generateChallengeResult.isLoading ||
      loginResult.isLoading ||
      logoutResult.isLoading,
  };
};
