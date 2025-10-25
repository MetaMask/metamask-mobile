import { useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import useThunkDispatch from '../../../hooks/useThunkDispatch';
import { verifyCardAuthentication } from '../../../../core/redux/slices/card';
import { selectUserLoggedIn } from '../../../../reducers/user';
<<<<<<< HEAD
import Logger from '../../../../util/Logger';
import useIsBaanxLoginEnabled from './isBaanxLoginEnabled';
=======
import {
  CardFeatureFlag,
  selectCardFeatureFlag,
} from '../../../../selectors/featureFlagController/card';
import Logger from '../../../../util/Logger';
>>>>>>> 8ae259608f (feat: card delegation)

/**
 * Hook that automatically verifies card authentication status when the app loads.
 * This hook should be used at the app entry level to ensure authentication state
 * is always up-to-date without needing to open the Card screen.
 */
export const useCardAuthenticationVerification = () => {
  const dispatch = useThunkDispatch();
  const userLoggedIn = useSelector(selectUserLoggedIn);
<<<<<<< HEAD
  const isBaanxLoginEnabled = useIsBaanxLoginEnabled();

  const checkAuthentication = useCallback(() => {
=======
  const cardFeatureFlag = useSelector(selectCardFeatureFlag) as CardFeatureFlag;

  const checkAuthentication = useCallback(() => {
    const isBaanxLoginEnabled = cardFeatureFlag?.isBaanxLoginEnabled ?? false;

>>>>>>> 8ae259608f (feat: card delegation)
    dispatch(
      verifyCardAuthentication({
        isBaanxLoginEnabled,
      }),
    );
<<<<<<< HEAD
  }, [isBaanxLoginEnabled, dispatch]);
=======
  }, [cardFeatureFlag, dispatch]);
>>>>>>> 8ae259608f (feat: card delegation)

  useEffect(() => {
    // Only run authentication check when:
    // 1. User is logged in
<<<<<<< HEAD
    // 2. Baanx login is enabled
    if (userLoggedIn && isBaanxLoginEnabled) {
=======
    // 2. Card feature flag is enabled
    if (userLoggedIn && cardFeatureFlag) {
>>>>>>> 8ae259608f (feat: card delegation)
      try {
        checkAuthentication();
      } catch (error) {
        Logger.error(
          error instanceof Error ? error : new Error(String(error)),
          'useCardAuthenticationVerification::Error verifying authentication',
        );
      }
    }
<<<<<<< HEAD
  }, [userLoggedIn, isBaanxLoginEnabled, checkAuthentication]);
=======
  }, [userLoggedIn, cardFeatureFlag, checkAuthentication]);
>>>>>>> 8ae259608f (feat: card delegation)
};
