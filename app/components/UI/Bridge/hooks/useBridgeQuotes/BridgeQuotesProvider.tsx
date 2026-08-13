import React, { createContext, useContext } from 'react';
import { useBridgeQuotes } from './index';

const BridgeQuotesContext = createContext<ReturnType<
  typeof useBridgeQuotes
> | null>(null);

export const BridgeQuotesProvider = ({
  children,
  config,
  managedRequest,
}: {
  children?: React.ReactNode;
} & Parameters<typeof useBridgeQuotes>[0]) => {
  const value = useBridgeQuotes({
    config,
    managedRequest,
  });

  return (
    <BridgeQuotesContext.Provider value={value}>
      {children}
    </BridgeQuotesContext.Provider>
  );
};

export const useBridgeQuotesContext = () => {
  const context = useContext(BridgeQuotesContext);

  if (!context) {
    throw new Error(
      'useBridgeQuotesContext must be used within BridgeQuotesProvider',
    );
  }

  return context;
};
