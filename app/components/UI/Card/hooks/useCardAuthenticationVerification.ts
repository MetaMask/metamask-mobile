import { useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import useThunkDispatch from '../../../hooks/useThunkDispatch';
import { verifyCardAuthentication } from '../../../../core/redux/slices/card';
import { selectUserLoggedIn } from '../../../../reducers/user';
import {
  CardFeatureFlag,
  selectCardFeatureFlag,
} from '../../../../selectors/featureFlagController/card';
import Logger from '../../../../util/Logger';

/**
 * Hook that automatically verifies card authentication status when the app loads.
 * This hook should be used at the app entry level to ensure authentication state
 * is always up-to-date without needing to open the Card screen.
 */
export const useCardAuthenticationVerification = () => {
  const dispatch = useThunkDispatch();
  const userLoggedIn = useSelector(selectUserLoggedIn);
  const cardFeatureFlag = useSelector(selectCardFeatureFlag) as CardFeatureFlag;

  const checkAuthentication = useCallback(() => {
    const isBaanxLoginEnabled = cardFeatureFlag?.isBaanxLoginEnabled ?? false;

    dispatch(
      verifyCardAuthentication({
        isBaanxLoginEnabled,
      }),
    );
  }, [cardFeatureFlag, dispatch]);

  useEffect(() => {
    // Only run authentication check when:
    // 1. User is logged in
    // 2. Card feature flag is enabled
    if (userLoggedIn && cardFeatureFlag) {
      try {
        checkAuthentication();
      } catch (error) {
        Logger.error(
          error instanceof Error ? error : new Error(String(error)),
          'useCardAuthenticationVerification::Error verifying authentication',
        );
      }
    }
  }, [userLoggedIn, cardFeatureFlag, checkAuthentication]);
};
