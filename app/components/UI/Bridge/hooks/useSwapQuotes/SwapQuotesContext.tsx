import React, { createContext, useMemo } from 'react';
import { type UseQuoteRequestParams, useQuoteRequest } from './useQuoteRequest';
import { useQuoteData, type UseQuoteDataParams } from './useQuoteData';

export type SwapQuotesContextValue = ReturnType<typeof useQuoteRequest> &
  ReturnType<typeof useQuoteData>;

export const SwapQuotesContext = createContext<SwapQuotesContextValue | null>(
  null,
);

interface SwapQuotesProviderProps
  extends UseQuoteRequestParams,
    UseQuoteDataParams {
  children: React.ReactNode;
}

export function SwapQuotesProvider({
  children,
  ...params
}: SwapQuotesProviderProps) {
  const requestData = useQuoteRequest(params);
  const quoteData = useQuoteData(params);

  const value = useMemo(
    () => ({ ...requestData, ...quoteData }),
    [requestData, quoteData],
  );

  return (
    <SwapQuotesContext.Provider value={value}>
      {children}
    </SwapQuotesContext.Provider>
  );
}
