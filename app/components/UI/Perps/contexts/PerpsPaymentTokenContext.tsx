import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import { AssetType } from '../../../Views/confirmations/types/token';

export interface PerpsPaymentTokenContextType {
  selectedToken: AssetType | null;
  onPaymentTokenChange: (token: AssetType | null) => void;
  /** True when inside PerpsPaymentTokenProvider; false when using default (e.g. outside Perps modal stack). */
  isInsideProvider: boolean;
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
    setSelectedToken(
      token?.description === 'perps-balance' ? null : token,
    );
  }, []);

  const value = useMemo(
    () => ({
      selectedToken,
      onPaymentTokenChange,
      isInsideProvider: true,
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
    // No-op when used outside PerpsPaymentTokenProvider
  },
  isInsideProvider: false,
};

export function usePerpsPaymentToken(): PerpsPaymentTokenContextType {
  const context = useContext(PerpsPaymentTokenContext);
  return context ?? defaultPerpsPaymentTokenContext;
}
