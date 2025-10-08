import React, {
  useState,
  createContext,
  useContext,
  useMemo,
  useEffect,
  useCallback,
} from 'react';
import { useSelector } from 'react-redux';

import { CardSDK } from './CardSDK';
import { selectCardFeatureFlag } from '../../../../selectors/featureFlagController/card';
import { useCardholderCheck } from '../hooks/useCardholderCheck';
import {
  getCardBaanxToken,
  removeCardBaanxToken,
  storeCardBaanxToken,
} from '../util/cardTokenVault';
import Logger from '../../../../util/Logger';

// Types
export interface ICardSDK {
  sdk: CardSDK | null;
  isAuthenticated: boolean;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
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
  const [sdk, setSdk] = useState<CardSDK | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userCardLocation, setUserCardLocation] = useState<
    'us' | 'international'
  >('international');
  const [isLoading, setIsLoading] = useState(false);

  // Initialize CardSDK when feature flag is enabled
  useEffect(() => {
    if (cardFeatureFlag) {
      const cardSDK = new CardSDK({ cardFeatureFlag });
      setSdk(cardSDK);
    } else {
      setSdk(null);
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

        // Store the new tokens
        await storeCardBaanxToken({
          accessToken: newTokens.accessToken,
          refreshToken: newTokens.refreshToken,
          expiresAt: Date.now() + newTokens.expiresIn * 1000,
          location,
        });

        Logger.log('Token refresh successful');
        setIsAuthenticated(true);
        setUserCardLocation(location);
      } catch (error) {
        Logger.log('Token refresh failed:', error);
        setIsAuthenticated(false);
      }
    },
    [sdk],
  );

  const handleTokenAuthentication = useCallback(async (): Promise<void> => {
    const tokenResult = await getCardBaanxToken();

    // If token retrieval failed, user is not authenticated
    if (!tokenResult.success) {
      Logger.log('Token retrieval failed:', tokenResult.error);
      setIsAuthenticated(false);
      return;
    }

    const { accessToken, refreshToken, expiresAt, location } =
      tokenResult.tokenData || {};

    // If no token data exists, user needs to authenticate
    if (!accessToken || !refreshToken || !expiresAt || !location) {
      Logger.log('No valid token data found');
      setIsAuthenticated(false);
      return;
    }

    // If token is still valid, user is authenticated
    if (Date.now() < expiresAt) {
      Logger.log('Token is valid');
      setIsAuthenticated(true);
      setUserCardLocation(location);
      return;
    }

    // Token is expired, attempt to refresh it
    Logger.log('Token expired, attempting refresh...');
    await attemptTokenRefresh(refreshToken, location);
  }, [attemptTokenRefresh]);

  // Check authentication status and handle token refresh
  useEffect(() => {
    const authenticateUser = async () => {
      Logger.log('Starting authentication check...');
      setIsLoading(true);

      try {
        await handleTokenAuthentication();
      } catch (error) {
        Logger.log('Authentication check failed:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    // Only run authentication check if SDK is available and Baanx login is enabled
    if (sdk?.isBaanxLoginEnabled) {
      authenticateUser();
    } else {
      Logger.log(
        'SDK not available or Baanx login not enabled, skipping authentication check',
      );
      setIsLoading(false);
      setIsAuthenticated(false);
    }
  }, [sdk?.isBaanxLoginEnabled, handleTokenAuthentication]);

  const logoutFromProvider = useCallback(async () => {
    if (!sdk) {
      throw new Error('SDK not available for logout');
    }

    await removeCardBaanxToken();
    setIsAuthenticated(false);
  }, [sdk]);

  // Memoized context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    (): ICardSDK => ({
      sdk,
      isAuthenticated,
      setIsAuthenticated,
      isLoading,
      logoutFromProvider,
      userCardLocation,
    }),
    [
      sdk,
      isAuthenticated,
      setIsAuthenticated,
      isLoading,
      logoutFromProvider,
      userCardLocation,
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
