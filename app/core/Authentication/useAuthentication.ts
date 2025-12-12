import { useCallback } from 'react';
import Authentication from './';

/**
 * Hook that interfaces with the Authentication service.
 */
export function useAuthentication() {
  const turnOffRememberMeAndLockApp = useCallback(
    () =>
      Authentication.lockApp({
        allowRememberMe: false,
      }),
    [],
  );

  return {
    turnOffRememberMeAndLockApp,
  };
}
