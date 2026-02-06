import React, {
  useState,
  createContext,
  useContext,
  useMemo,
  useEffect,
  useCallback,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { CardSDK } from './CardSDK';
import {
  CardFeatureFlag,
  selectCardFeatureFlag,
} from '../../../../selectors/featureFlagController/card';
import { useCardholderCheck } from '../hooks/useCardholderCheck';
import { useCardAuthenticationVerification } from '../hooks/useCardAuthenticationVerification';
import { removeCardBaanxToken } from '../util/cardTokenVault';
import {
  selectUserCardLocation,
  selectOnboardingId,
  resetOnboardingState,
  resetAuthenticatedData,
  clearAllCache,
  setContactVerificationId,
  setUserCardLocation,
} from '../../../../core/redux/slices/card';
import { UserResponse } from '../types';
import { getErrorMessage } from '../util/getErrorMessage';
import { mapCountryToLocation } from '../util/mapCountryToLocation';

// Types
export interface ICardSDK {
  sdk: CardSDK | null;
  isLoading: boolean;
  user: UserResponse | null;
  setUser: (user: UserResponse | null) => void;
  logoutFromProvider: () => Promise<void>;
  fetchUserData: () => Promise<void>;
  isReturningSession: boolean;
}

interface ProviderProps<T> {
  value?: T;
  children?: React.ReactNode;
}

// Context
const CardSDKContext = createContext<ICardSDK | undefined>(undefined);

/**
 * CardSDKProvider manages the Card SDK instance.
 * It handles SDK initialization. Authentication is handled separately
 * by the CardAuthenticationVerification component at the app level.
 */
export const CardSDKProvider = ({
  value,
  ...props
}: ProviderProps<ICardSDK>) => {
  const cardFeatureFlag = useSelector(selectCardFeatureFlag);
  const userCardLocation = useSelector(selectUserCardLocation);
  const onboardingId = useSelector(selectOnboardingId);
  const dispatch = useDispatch();
  const [sdk, setSdk] = useState<CardSDK | null>(null);
  // Start with true to indicate initialization in progress
  const [isLoading, setIsLoading] = useState(true);
  // Add user state management
  const [user, setUser] = useState<UserResponse | null>(null);

  // Initialize CardSDK when feature flag is enabled
  useEffect(() => {
    if (cardFeatureFlag) {
      setIsLoading(true);
      const cardSDK = new CardSDK({
        cardFeatureFlag: cardFeatureFlag as CardFeatureFlag,
        userCardLocation,
      });
      setSdk(cardSDK);
      setIsLoading(false);
    } else {
      setSdk(null);
      setIsLoading(false);
    }
  }, [cardFeatureFlag, userCardLocation]);

  const fetchUserData = useCallback(async () => {
    if (!sdk || !onboardingId) {
      return;
    }

    setIsLoading(true);

    try {
      const userData = await sdk.getRegistrationStatus(
        onboardingId,
        userCardLocation,
      );

      if (userData.contactVerificationId) {
        dispatch(setContactVerificationId(userData.contactVerificationId));
      }
      dispatch(
        setUserCardLocation(
          mapCountryToLocation(userData.countryOfResidence ?? null),
        ),
      );

      setUser(userData);
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      if (errorMessage?.includes('Invalid onboarding ID')) {
        dispatch(resetOnboardingState());
      }
    } finally {
      setIsLoading(false);
    }
  }, [sdk, onboardingId, dispatch, userCardLocation]);

  // Track whether onboardingId existed at initial mount (for resuming incomplete onboarding)
  const [hasInitialOnboardingId] = useState(() => !!onboardingId);

  // Fetch user data ONLY on initial mount if onboardingId already exists.
  // This prevents fetching when onboardingId is newly set during email verification,
  // which could cause race conditions and navigation issues.
  useEffect(() => {
    if (!sdk || !onboardingId || !hasInitialOnboardingId) {
      return;
    }

    fetchUserData();
    // eslint-disable-next-line react-compiler/react-compiler
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sdk]);

  const logoutFromProvider = useCallback(async () => {
    if (!sdk) {
      throw new Error('SDK not available for logout');
    }

    await removeCardBaanxToken();
    dispatch(resetAuthenticatedData());
    dispatch(clearAllCache());
    dispatch(resetOnboardingState());
    setUser(null);
  }, [sdk, dispatch]);

  // Memoized context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    (): ICardSDK => ({
      sdk,
      isLoading,
      user,
      setUser,
      logoutFromProvider,
      fetchUserData,
      isReturningSession: hasInitialOnboardingId,
    }),
    [
      sdk,
      isLoading,
      user,
      setUser,
      logoutFromProvider,
      fetchUserData,
      hasInitialOnboardingId,
    ],
  );

  return <CardSDKContext.Provider value={value || contextValue} {...props} />;
};

/**
 * Hook to access CardSDK context.
 * Must be used within a CardSDKProvider.
 */
export const useCardSDK = () => {
  const contextValue = useContext(CardSDKContext);
  if (!contextValue) {
    throw new Error('useCardSDK must be used within a CardSDKProvider');
  }
  return contextValue;
};

/**
 * Higher-order component that wraps a component with CardSDKProvider.
 */
export const withCardSDK =
  (Component: React.ComponentType) => (props: Record<string, unknown>) => (
    <CardSDKProvider>
      <Component {...props} />
    </CardSDKProvider>
  );

/**
 * Component that performs cardholder verification.
 * This should be mounted at the app entry level to ensure
 * cardholder verification is always up-to-date.
 * Returns null as it's just a side-effect component.
 */
export const CardVerification: React.FC = () => {
  useCardholderCheck();
  useCardAuthenticationVerification();

  return null;
};

export default CardSDKContext;
