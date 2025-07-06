import React, {
  useState,
  createContext,
  useContext,
  useMemo,
  useEffect,
} from 'react';
import { useSelector } from 'react-redux';

import { selectChainId } from '../../../../selectors/networkController';
import { selectCardFeature } from '../../../../selectors/featureFlagController/card';

import { CardholderSDK } from './CardholderSDK';

export interface CardSDK {
  sdk: CardholderSDK | null;
}

interface ProviderProps<T> {
  value?: T;
  children?: React.ReactNode;
}

const CardSDKContext = createContext<CardSDK | undefined>(undefined);

export const CardSDKProvider = ({
  value,
  ...props
}: ProviderProps<CardSDK>) => {
  const selectedChainId = useSelector(selectChainId);
  const cardFeatureFlag = useSelector(selectCardFeature);

  const [sdk, setSdk] = useState<CardholderSDK | null>(null);

  // Initialize CardholderSDK if card feature flag is enabled and chain ID is selected
  useEffect(() => {
    if (cardFeatureFlag && selectedChainId) {
      const cardholderSDK = new CardholderSDK({
        cardFeatureFlag,
        rawChainId: selectedChainId,
      });
      setSdk(cardholderSDK);
    }
  }, [cardFeatureFlag, selectedChainId]);

  const contextValue = useMemo(
    (): CardSDK => ({
      sdk,
    }),
    [sdk],
  );

  return <CardSDKContext.Provider value={value || contextValue} {...props} />;
};

export const useCardSDK = () => {
  const contextValue = useContext(CardSDKContext);
  if (!contextValue) {
    throw new Error('useCardSDK must be used within a CardSDKProvider');
  }
  return contextValue;
};

// HOC wrapper similar to withRampSDK
// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const withCardSDK = (Component: React.FC) => (props: any) =>
  (
    <CardSDKProvider>
      <Component {...props} />
    </CardSDKProvider>
  );

export default CardSDKContext;
