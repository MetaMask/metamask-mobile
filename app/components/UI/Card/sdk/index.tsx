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
import { LINEA_CHAIN_ID } from '@metamask/swaps-controller/dist/constants';

export interface ICardSDK {
  sdk: CardSDK | null;
}

interface ProviderProps<T> {
  value?: T;
  children?: React.ReactNode;
}

const CardSDKContext = createContext<ICardSDK | undefined>(undefined);

export const CardSDKProvider = ({
  value,
  ...props
}: ProviderProps<ICardSDK>) => {
  const cardFeatureFlag = useSelector(selectCardFeatureFlag);

  const [sdk, setSdk] = useState<CardSDK | null>(null);

  // Initialize CardholderSDK if card feature flag is enabled and chain ID is selected
  useEffect(() => {
    if (cardFeatureFlag) {
      const cardSDK = new CardSDK({
        cardFeatureFlag,
        rawChainId: LINEA_CHAIN_ID,
      });
      setSdk(cardSDK);
    } else {
      setSdk(null);
    }
  }, [cardFeatureFlag]);

  const contextValue = useMemo(
    (): ICardSDK => ({
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

export const withCardSDK =
  (Component: React.ComponentType) => (props: Record<string, unknown>) =>
    (
      <CardSDKProvider>
        <Component {...props} />
      </CardSDKProvider>
    );

export const CardVerification: React.FC = () => {
  useCardholderCheck();

  return null;
};

export default CardSDKContext;
