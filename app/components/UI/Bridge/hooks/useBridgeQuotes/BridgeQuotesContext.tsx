import React, { createContext, useMemo } from 'react';
import { type UseQuoteRequestParams, useQuoteRequest } from './useQuoteRequest';
import { useQuoteData, type UseQuoteDataParams } from './useQuoteData';

export type BridgeQuotesContextValue = ReturnType<typeof useQuoteRequest> &
  ReturnType<typeof useQuoteData>;

export const BridgeQuotesContext =
  createContext<BridgeQuotesContextValue | null>(null);

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
