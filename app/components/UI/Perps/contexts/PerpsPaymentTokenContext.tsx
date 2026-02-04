import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import { AssetType } from '../../../Views/confirmations/types/token';
import { Alert } from 'react-native';

export interface PerpsPaymentTokenContextType {
  selectedToken: AssetType | null;
  onPaymentTokenChange: (token: AssetType | null) => void;
}

const PerpsPaymentTokenContext =
  createContext<PerpsPaymentTokenContextType | null>(null);

interface PerpsPaymentTokenProviderProps {
  children: ReactNode;
}

export const PerpsPaymentTokenProvider = ({
  children,
}: PerpsPaymentTokenProviderProps) => {
  const [selectedToken, setSelectedToken] = useState<AssetType | null>(null);

  const onPaymentTokenChange = useCallback((token: AssetType | null) => {
    const isPerpsBalance = token?.description === 'perps-balance';
    Alert.alert('isPerpsBalance', isPerpsBalance.toString());
    setSelectedToken(
      isPerpsBalance ? null : token,
    );
  }, []);

  const value = useMemo(
    () => ({
      selectedToken,
      onPaymentTokenChange,
    }),
    [selectedToken, onPaymentTokenChange],
  );

  return (
    <PerpsPaymentTokenContext.Provider value={value}>
      {children}
    </PerpsPaymentTokenContext.Provider>
  );
};

const defaultPerpsPaymentTokenContext: PerpsPaymentTokenContextType = {
  selectedToken: null,
  onPaymentTokenChange: (_token: AssetType | null) => {
    Alert.alert('onPaymentTokenChange', 'No-op when used outside PerpsPaymentTokenProvider');
  },
};

export function usePerpsPaymentToken(): PerpsPaymentTokenContextType {
  const context = useContext(PerpsPaymentTokenContext);
  return context ?? defaultPerpsPaymentTokenContext;
}
