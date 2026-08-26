import React, { createContext, useMemo } from 'react';
import { useSelector } from 'react-redux';

import { type UseQuoteRequestParams, useQuoteRequest } from './useQuoteRequest';
import { selectBridgeControllerState } from '../../../../../core/redux/slices/bridge';
import { useValidQuotes } from '../useValidQuotes';
import { useBlockaidError } from '../useBlockaidError';
import { useFormattedQuoteData } from '../useFormattedQuoteData';
import type { UseBridgeQuotesParams } from './types';

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

export interface UseQuoteDataParams extends UseBridgeQuotesParams {}

const useQuoteData = ({
  latestSourceAtomicBalance,
  quoteParams,
}: UseQuoteDataParams) => {
  const { quoteFetchError, quotesLoadingStatus } = useSelector(
    selectBridgeControllerState,
  );

  // Resolve active quote and availability status
  const {
    activeQuote,
    bestQuote,
    isActiveQuoteForCurrentTokenPair,
    isExpired,
    isLoading,
    isNoQuotesAvailable,
    needsNewQuote,
    validQuotes,
    willRefresh,
  } = useValidQuotes({ latestSourceAtomicBalance, quoteParams });

  // Validate solana quotes
  const blockaidError = useBlockaidError({ activeQuote });

  // Format quote data
  const { destTokenAmount, formattedQuoteData, shouldShowPriceImpactWarning } =
    useFormattedQuoteData({
      activeQuote,
      isActiveQuoteForCurrentTokenPair,
      quoteParams,
    });

  return useMemo(
    () => ({
      activeQuote,
      bestQuote,
      blockaidError,
      destTokenAmount,
      formattedQuoteData,
      isActiveQuoteForCurrentTokenPair,
      isExpired,
      isLoading,
      isNoQuotesAvailable,
      needsNewQuote,
      quoteFetchError,
      quotesLoadingStatus,
      shouldShowPriceImpactWarning,
      validQuotes,
      willRefresh,
    }),
    [
      activeQuote,
      bestQuote,
      blockaidError,
      destTokenAmount,
      formattedQuoteData,
      isActiveQuoteForCurrentTokenPair,
      isExpired,
      isLoading,
      isNoQuotesAvailable,
      needsNewQuote,
      quoteFetchError,
      quotesLoadingStatus,
      shouldShowPriceImpactWarning,
      validQuotes,
      willRefresh,
    ],
  );
};

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
