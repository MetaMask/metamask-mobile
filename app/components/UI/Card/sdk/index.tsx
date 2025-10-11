import React, {
  useState,
  createContext,
  useContext,
  useMemo,
  useEffect,
} from 'react';
import { useSelector } from 'react-redux';

import { CardSDK } from './CardSDK';
import { selectCardFeatureFlag } from '../../../../selectors/featureFlagController/card';
import { useCardholderCheck } from '../hooks/useCardholderCheck';

// Types
export interface ICardSDK {
  sdk: CardSDK | null;
}

interface ProviderProps<T> {
  value?: T;
  children?: React.ReactNode;
}

// Context
const CardSDKContext = createContext<ICardSDK | undefined>(undefined);

/**
 * CardSDKProvider provides legacy CardSDK for backward compatibility.
 * New code should use CardController via Engine instead.
 *
 * @deprecated Use CardController via Engine.controllerMessenger instead
 */
export const CardSDKProvider = ({
  value,
  ...props
}: ProviderProps<ICardSDK>) => {
  const cardFeatureFlag = useSelector(selectCardFeatureFlag);
  const [sdk, setSdk] = useState<CardSDK | null>(null);

  // Initialize CardSDK when feature flag is enabled (for backward compatibility)
  useEffect(() => {
    if (cardFeatureFlag) {
      const cardSDK = new CardSDK({ cardFeatureFlag });
      setSdk(cardSDK);
    } else {
      setSdk(null);
    }
  }, [cardFeatureFlag]);

  // Memoized context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    (): ICardSDK => ({
      sdk,
    }),
    [sdk],
  );

  return <CardSDKContext.Provider value={value || contextValue} {...props} />;
};

/**
 * Hook to access CardSDK context.
 * Must be used within a CardSDKProvider.
 *
 * @deprecated Use CardController via Engine.controllerMessenger instead
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
 *
 * @deprecated Use CardController via Engine.controllerMessenger instead
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
