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
import {
  getCardBaanxToken,
  removeCardBaanxToken,
  storeCardBaanxToken,
} from '../util/cardTokenVault';
import Logger from '../../../../util/Logger';
import {
  setAuthenticatedPriorityToken,
  setAuthenticatedPriorityTokenLastFetched,
  setIsAuthenticatedCard,
} from '../../../../core/redux/slices/card';

// Types
export interface ICardSDK {
  sdk: CardSDK | null;
  isLoading: boolean;
  logoutFromProvider: () => Promise<void>;
  userCardLocation: 'us' | 'international';
}

interface ProviderProps<T> {
  value?: T;
  children?: React.ReactNode;
}

// Context
const CardSDKContext = createContext<ICardSDK | undefined>(undefined);

/**
 * CardSDKProvider manages the Card SDK instance and authentication state.
 * It handles SDK initialization, token validation, and automatic token refresh.
 */
export const CardSDKProvider = ({
  value,
  ...props
}: ProviderProps<ICardSDK>) => {
  const cardFeatureFlag = useSelector(selectCardFeatureFlag);
  const dispatch = useDispatch();
  const [sdk, setSdk] = useState<CardSDK | null>(null);
  const [userCardLocation, setUserCardLocation] = useState<
    'us' | 'international'
  >('international');
  // Start with true to indicate initialization in progress
  const [isLoading, setIsLoading] = useState(true);

  const isBaanxLoginEnabled = sdk?.isBaanxLoginEnabled ?? false;

  const removeAuthenticatedData = useCallback(() => {
    dispatch(setIsAuthenticatedCard(false));
    dispatch(setAuthenticatedPriorityTokenLastFetched(null));
    dispatch(setAuthenticatedPriorityToken(null));
  }, [dispatch]);

  // Initialize CardSDK when feature flag is enabled
  useEffect(() => {
    if (cardFeatureFlag) {
      setIsLoading(true);
      const cardSDK = new CardSDK({
        cardFeatureFlag: cardFeatureFlag as CardFeatureFlag,
      });
      setSdk(cardSDK);
    } else {
      setSdk(null);
      setIsLoading(false);
    }
  }, [cardFeatureFlag]);

  const attemptTokenRefresh = useCallback(
    async (
      refreshToken: string,
      location: 'us' | 'international',
    ): Promise<void> => {
      if (!sdk) {
        throw new Error('SDK not available for token refresh');
      }

      try {
        const newTokens = await sdk.refreshLocalToken(refreshToken, location);

        if (!newTokens?.accessToken || !newTokens?.refreshToken) {
          throw new Error('Invalid token response from refresh request');
        }

        await storeCardBaanxToken({
          accessToken: newTokens.accessToken,
          refreshToken: newTokens.refreshToken,
          expiresAt: Date.now() + newTokens.expiresIn * 1000,
          location,
        });

        dispatch(setIsAuthenticatedCard(true));
        setUserCardLocation(location);
      } catch (error) {
        Logger.log('Token refresh failed:', error);
        removeAuthenticatedData();
      }
    },
    [sdk, removeAuthenticatedData, dispatch],
  );

  const handleTokenAuthentication = useCallback(async (): Promise<void> => {
    const tokenResult = await getCardBaanxToken();

    if (tokenResult.success && !tokenResult.tokenData) {
      removeAuthenticatedData();
      return;
    }

    Logger.log('Token result:', tokenResult);

    // If token retrieval failed, user is not authenticated
    if (
      !tokenResult.success ||
      !tokenResult.tokenData?.accessToken ||
      !tokenResult.tokenData?.refreshToken ||
      !tokenResult.tokenData?.expiresAt ||
      !tokenResult.tokenData?.location
    ) {
      removeAuthenticatedData();
      return;
    }

    const { refreshToken, expiresAt, location } = tokenResult.tokenData;

    // If token is still valid, user is authenticated
    if (Date.now() < expiresAt) {
      dispatch(setIsAuthenticatedCard(true));
      setUserCardLocation(location);
      return;
    }

    await attemptTokenRefresh(refreshToken, location);
  }, [attemptTokenRefresh, removeAuthenticatedData, dispatch]);

  // Check authentication status and handle token refresh
  useEffect(() => {
    // Only run if SDK has been initialized
    if (!sdk) {
      return;
    }

    const authenticateUser = async () => {
      try {
        await handleTokenAuthentication();
      } catch (error) {
        Logger.log('Authentication check failed:', error);
        removeAuthenticatedData();
      } finally {
        setIsLoading(false);
      }
    };

    // Only run authentication check if SDK is available and Baanx login is enabled
    if (isBaanxLoginEnabled) {
      authenticateUser();
    } else {
      // SDK is ready but Baanx login not enabled
      setIsLoading(false);
      removeAuthenticatedData();
    }
  }, [
    sdk,
    isBaanxLoginEnabled,
    handleTokenAuthentication,
    removeAuthenticatedData,
  ]);

  const logoutFromProvider = useCallback(async () => {
    if (!sdk) {
      throw new Error('SDK not available for logout');
    }

    await removeCardBaanxToken();
    removeAuthenticatedData();
  }, [sdk, removeAuthenticatedData]);

  // Memoized context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    (): ICardSDK => ({
      sdk,
      isLoading,
      logoutFromProvider,
      userCardLocation,
    }),
    [sdk, isLoading, logoutFromProvider, userCardLocation],
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
  (Component: React.ComponentType) => (props: Record<string, unknown>) =>
    (
      <CardSDKProvider>
        <Component {...props} />
      </CardSDKProvider>
    );

/**
 * Component that performs cardholder verification.
 * Returns null as it's just a side-effect component.
 */
export const CardVerification: React.FC = () => {
  useCardholderCheck();
  return null;
};

export default CardSDKContext;
