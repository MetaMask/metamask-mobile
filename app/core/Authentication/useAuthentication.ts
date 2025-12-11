import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { setAllowLoginWithRememberMe } from '../../actions/security';
import Authentication from './Authentication';

/**
 * Custom hook to manage authentication features.
 * This hook centralizes authentication-related operations by combining
 * Authentication Service calls with Redux action dispatching.
 *
 * @returns An object containing authentication-related functions.
 */
export function useAuthentication() {
  const dispatch = useDispatch();

  /**
   * Turns off the "Remember Me" feature and locks the app.
   * This function dispatches the Redux action to disable remember me
   * and then locks the app using the Authentication service.
   */
  const turnOffRememberMeAndLockApp = useCallback(async () => {
    dispatch(setAllowLoginWithRememberMe(false));
    await Authentication.lockApp();
  }, [dispatch]);

  return {
    turnOffRememberMeAndLockApp,
  };
}
