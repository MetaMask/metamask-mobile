import { useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import useThunkDispatch from '../../../hooks/useThunkDispatch';
import {
  resetAuthenticatedData,
  selectIsAuthenticatedCard,
  verifyCardAuthentication,
} from '../../../../core/redux/slices/card';
import { selectUserLoggedIn } from '../../../../reducers/user';
import Logger from '../../../../util/Logger';
import useIsBaanxLoginEnabled from './isBaanxLoginEnabled';

/**
 * Hook that automatically verifies card authentication status when the app loads.
 * This hook should be used at the app entry level to ensure authentication state
 * is always up-to-date without needing to open the Card screen.
 */
export const useCardAuthenticationVerification = () => {
  const dispatch = useThunkDispatch();
  const userLoggedIn = useSelector(selectUserLoggedIn);
  const isBaanxLoginEnabled = useIsBaanxLoginEnabled();
  const isAuthenticated = useSelector(selectIsAuthenticatedCard);

  const checkAuthentication = useCallback(() => {
    dispatch(
      verifyCardAuthentication({
        isBaanxLoginEnabled,
      }),
    );
  }, [isBaanxLoginEnabled, dispatch]);

  useEffect(() => {
    // Only run authentication check when:
    // 1. User is logged in
    // 2. Baanx login is enabled
    // As a fallback, set the authentication state to false
    if (userLoggedIn && isBaanxLoginEnabled) {
      try {
        checkAuthentication();
      } catch (error) {
        Logger.error(
          error instanceof Error ? error : new Error(String(error)),
          'useCardAuthenticationVerification::Error verifying authentication',
        );
      }
    } else if (userLoggedIn && !isBaanxLoginEnabled) {
      if (isAuthenticated) {
        Logger.log(
          'useCardAuthenticationVerification::User is logged in but Baanx login is disabled, setting authentication state to false',
        );
        dispatch(resetAuthenticatedData());
      }
    }
  }, [
    userLoggedIn,
    isBaanxLoginEnabled,
    checkAuthentication,
    dispatch,
    isAuthenticated,
  ]);
};
