import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useDevOnlyLoginMutation } from '../services';
import Engine from '../../../Engine';
import { selectDevOnlyLoginAddress } from '../../../../../selectors/rewardscontroller';

/**
 * Hook for development-only login to the rewards system
 * This should only be used in development environments
 */
export const useDevOnlyLogin = ({
  onLoginSuccess,
}: { onLoginSuccess?: () => void } = {}) => {
  const [devOnlyLogin, devOnlyLoginResult] = useDevOnlyLoginMutation();

  const devOnlyLoginAddress = useSelector(selectDevOnlyLoginAddress);

  const login = useCallback(
    async (address: string) => {
      try {
        await devOnlyLogin({ address }).unwrap();
        // eslint-disable-next-line no-console
        console.log('Dev-only login successful');
        // Store the address in RewardsController state
        Engine.context.RewardsController.setDevOnlyLoginAddress(address);
        onLoginSuccess?.();
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Dev-only login failed:', error);
        throw error;
      }
    },
    [devOnlyLogin, onLoginSuccess],
  );

  return {
    login,
    devOnlyLoginAddress,
    isLoading: devOnlyLoginResult.isLoading,
    isError: devOnlyLoginResult.isError,
    error: devOnlyLoginResult.error,
  };
};
