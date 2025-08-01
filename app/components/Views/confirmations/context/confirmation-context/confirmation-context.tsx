import React, { useContext, useMemo, useState } from 'react';
import { useTransactionBridgeQuotes } from '../../hooks/pay/useTransactionBridgeQuotes';
import { TransactionBridgeQuote } from '../../utils/bridge';

export interface ConfirmationContextParams {
  isTransactionValueUpdating: boolean;
  quotes?: TransactionBridgeQuote[];
  quotesLoading: boolean;
  setIsTransactionValueUpdating: (isTransactionValueUpdating: boolean) => void;
}

// This context is used to share the valuable information between the components
// that are used to render the confirmation
const ConfirmationContext = React.createContext<ConfirmationContextParams>({
  isTransactionValueUpdating: false,
  // eslint-disable-next-line no-empty-function
  setIsTransactionValueUpdating: () => {},
  quotes: undefined,
  quotesLoading: false,
});

interface ConfirmationContextProviderProps {
  children: React.ReactNode;
}

export const ConfirmationContextProvider: React.FC<
  ConfirmationContextProviderProps
> = ({ children }) => {
  const [isTransactionValueUpdating, setIsTransactionValueUpdating] =
    useState(false);

  const { quotes, loading: quotesLoading } = useTransactionBridgeQuotes();

  const contextValue = useMemo(
    () => ({
      isTransactionValueUpdating,
      quotes,
      quotesLoading,
      setIsTransactionValueUpdating,
    }),
    [
      isTransactionValueUpdating,
      quotes,
      quotesLoading,
      setIsTransactionValueUpdating,
    ],
  );

  return (
    <ConfirmationContext.Provider value={contextValue}>
      {children}
    </ConfirmationContext.Provider>
  );
};

export const useConfirmationContext = () => {
  const context = useContext(ConfirmationContext);
  if (!context) {
    throw new Error(
      'useConfirmationContext must be used within a ConfirmationContextProvider',
    );
  }
  return context;
};
