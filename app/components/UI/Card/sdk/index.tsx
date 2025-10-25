import React, {
  useState,
  createContext,
  useContext,
  useMemo,
  useEffect,
  useCallback,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectChainId } from '../../../../selectors/networkController';
import Logger from '../../../../util/Logger';

import { CardSDK } from './CardSDK';
import {
  CardFeatureFlag,
  selectCardFeatureFlag,
} from '../../../../selectors/featureFlagController/card';
import { useCardholderCheck } from '../hooks/useCardholderCheck';
import { useCardAuthenticationVerification } from '../hooks/useCardAuthenticationVerification';
import { removeCardBaanxToken } from '../util/cardTokenVault';
import {
  setAuthenticatedPriorityToken,
  setAuthenticatedPriorityTokenLastFetched,
  setIsAuthenticatedCard,
  selectUserCardLocation,
  setUserCardLocation,
} from '../../../../core/redux/slices/card';

// Types
export interface ICardSDK {
  sdk: CardSDK | null;
  isLoading: boolean;
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
  const dispatch = useDispatch();
  const [sdk, setSdk] = useState<CardSDK | null>(null);
  // Start with true to indicate initialization in progress
  const [isLoading, setIsLoading] = useState(true);

  // Get current chain ID from network controller
  const hexChainId = useSelector(selectChainId);
  const currentChainId = useMemo(() => {
    if (hexChainId) {
      const decimalChainId = parseInt(hexChainId, 16);
      Logger.log(
        'CardSDKProvider: Resolved currentChainId (decimal):',
        decimalChainId,
      );
      Logger.log('CardSDKProvider: Resolved currentChainId (hex):', hexChainId);
      return `eip155:${decimalChainId}` as const;
    }
    Logger.log('CardSDKProvider: Defaulting currentChainId to Linea Mainnet');
    return 'eip155:59144' as const; // Default to Linea Mainnet
  }, [hexChainId]);

  const removeAuthenticatedData = useCallback(() => {
    dispatch(setIsAuthenticatedCard(false));
    dispatch(setAuthenticatedPriorityTokenLastFetched(null));
    dispatch(setAuthenticatedPriorityToken(null));
    dispatch(setUserCardLocation(null));
  }, [dispatch]);

  // Initialize CardSDK when feature flag is enabled
  useEffect(() => {
    if (cardFeatureFlag) {
      setIsLoading(true);
      Logger.log(
        'CardSDKProvider: Initializing CardSDK with currentChainId:',
        currentChainId,
      );
      const cardSDK = new CardSDK({
        cardFeatureFlag: cardFeatureFlag as CardFeatureFlag,
        userCardLocation,
        currentChainId,
      });
      setSdk(cardSDK);
    } else {
      setSdk(null);
      setIsLoading(false);
    }

    setIsLoading(false);
  }, [cardFeatureFlag, userCardLocation, currentChainId]);

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
    }),
    [sdk, isLoading, logoutFromProvider],
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
