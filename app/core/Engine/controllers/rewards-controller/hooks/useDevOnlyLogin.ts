import { useCallback } from 'react';
import { useDevOnlyLoginMutation } from '../services';

/**
 * Hook for development-only login to the rewards system
 * This should only be used in development environments
 */
export const useDevOnlyLogin = ({
  onLoginSuccess,
}: { onLoginSuccess?: () => void } = {}) => {
  const [devOnlyLogin, devOnlyLoginResult] = useDevOnlyLoginMutation();

  const login = useCallback(
    async (address: string) => {
      try {
        await devOnlyLogin({ address }).unwrap();
        // eslint-disable-next-line no-console
        console.log('Dev-only login successful');
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
    isLoading: devOnlyLoginResult.isLoading,
    isError: devOnlyLoginResult.isError,
    error: devOnlyLoginResult.error,
  };
};
