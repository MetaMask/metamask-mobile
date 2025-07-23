/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { checkCardholderAccounts } from '../actions/card';
import { selectIsCardDataLoaded } from '../selectors/card';
import useThunkDispatch from '../components/hooks/useThunkDispatch';
import { selectCardFeatureFlag } from '../selectors/featureFlagController/card';

/**
 * Hook that automatically checks for cardholder accounts when conditions are met
 * This should be used once in the App component to trigger the check
 */
export const useCardholderCheck = () => {
  const dispatch = useThunkDispatch();
  const isDataLoaded = useSelector(selectIsCardDataLoaded);

  // Get app readiness states
  const userLoggedIn = useSelector((state: any) => state.user.userLoggedIn);
  const appServicesReady = useSelector(
    (state: any) => state.user.appServicesReady,
  );
  const cardFeatureFlag = useSelector(selectCardFeatureFlag);

  useEffect(() => {
    // Only check if user is logged in, services are ready, and data hasn't been loaded yet
    if (userLoggedIn && appServicesReady && !isDataLoaded) {
      dispatch(checkCardholderAccounts(cardFeatureFlag));
    }
  }, [userLoggedIn, appServicesReady, cardFeatureFlag, isDataLoaded, dispatch]);
};
