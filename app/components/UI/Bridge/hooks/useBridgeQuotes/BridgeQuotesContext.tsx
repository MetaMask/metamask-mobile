import React, { createContext, useContext } from 'react';
import { useBridgeQuoteRequest, type UseBridgeQuotesParams } from './index';

type BridgeQuotesContextValue = ReturnType<typeof useQuoteRequest>;

const BridgeQuotesContext = createContext<BridgeQuotesContextValue | null>(
  null,
);

interface BridgeQuotesProviderProps extends UseBridgeQuotesParams {
  children: React.ReactNode;
}

export function BridgeQuotesProvider({
  children,
  ...params
}: BridgeQuotesProviderProps) {
  const requestData = useQuoteRequest(params);

  const value = useMemo(() => requestData, [requestData]);

  return (
    <BridgeQuotesContext.Provider value={value}>
      {children}
    </BridgeQuotesContext.Provider>
  );
}

/**
 * Hook for updating the bridge-controller's quoteRequest state and returning quote data
 */
export function useBridgeQuotes(): BridgeQuotesContextValue {
  const context = useContext(BridgeQuotesContext);

  if (!context) {
    throw new Error('useBridgeQuotes must be used within BridgeQuotesProvider');
  }

  return context;
}
