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
} from '../../../../core/redux/slices/card';
import { UserResponse } from '../types';

// Types
export interface ICardSDK {
  sdk: CardSDK | null;
  isLoading: boolean;
  user: UserResponse | null;
  setUser: (user: UserResponse | null) => void;
  logoutFromProvider: () => Promise<void>;
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

  const removeAuthenticatedData = useCallback(() => {
    dispatch(resetAuthenticatedData());
  }, [dispatch]);

  // Initialize CardSDK when feature flag is enabled
  useEffect(() => {
    if (cardFeatureFlag) {
      setIsLoading(true);
      const cardSDK = new CardSDK({
        cardFeatureFlag: cardFeatureFlag as CardFeatureFlag,
        userCardLocation,
      });
      setSdk(cardSDK);
    } else {
      setSdk(null);
      setIsLoading(false);
    }

    setIsLoading(false);
  }, [cardFeatureFlag, userCardLocation]);

  // Fetch user data on mount if onboardingId exists
  useEffect(() => {
    const fetchUserData = async () => {
      if (!sdk || !onboardingId) {
        return;
      }
      setIsLoading(true);

      try {
        const userData = await sdk.getRegistrationStatus(onboardingId);
        setUser(userData);
      } catch {
        // Assume user is not registered
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [sdk, onboardingId]);

  const logoutFromProvider = useCallback(async () => {
    if (!sdk) {
      throw new Error('SDK not available for logout');
    }

    await removeCardBaanxToken();
    removeAuthenticatedData();

    // Clear all cached data (card details, priority tokens, etc.)
    dispatch(clearAllCache());

    // reset onboarding state
    dispatch(resetOnboardingState());

    // Clear user data from context
    setUser(null);
  }, [sdk, removeAuthenticatedData, dispatch]);

  // Memoized context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    (): ICardSDK => ({
      sdk,
      isLoading,
      user,
      setUser,
      logoutFromProvider,
    }),
    [sdk, isLoading, user, setUser, logoutFromProvider],
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
