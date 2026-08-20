import React, { createContext, useContext, useMemo } from 'react';
import {
  useQuoteRequest,
  useQuoteData,
  type UseQuoteRequestParams,
  type UseQuoteDataParams,
} from './index';

type BridgeQuotesContextValue = ReturnType<typeof useQuoteRequest> &
  ReturnType<typeof useQuoteData>;

const BridgeQuotesContext = createContext<BridgeQuotesContextValue | null>(
  null,
);

interface BridgeQuotesProviderProps
  extends UseQuoteRequestParams,
    UseQuoteDataParams {
  children: React.ReactNode;
}

export function BridgeQuotesProvider({
  children,
  ...params
}: BridgeQuotesProviderProps) {
  const requestData = useQuoteRequest(params);
  const quoteData = useQuoteData(params);

  const value = useMemo(
    () => ({ ...requestData, ...quoteData }),
    [requestData, quoteData],
  );

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
