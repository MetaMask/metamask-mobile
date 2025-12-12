import { useCallback } from 'react';
import Authentication from './';

/**
 * Custom hook to manage authentication features.
 * This hook centralizes authentication-related operations by combining
 * Authentication Service calls with Redux action dispatching.
 *
 * @returns An object containing authentication-related functions.
 */
export function useAuthentication() {
  /**
   * Turns off the "Remember Me" feature and locks the app.
   * This function dispatches the Redux action to disable remember me
   * and then locks the app using the Authentication service.
   */
  const turnOffRememberMeAndLockApp = useCallback(async () => {
    await Authentication.lockApp({ allowRememberMe: false });
  }, []);

  return {
    turnOffRememberMeAndLockApp,
  };
}
