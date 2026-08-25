import { useSelector } from 'react-redux';

import { useMemo } from 'react';

import { selectBridgeControllerState } from '../../../../../core/redux/slices/bridge';
import { useValidQuotes } from './useValidQuotes';
import { useBlockaidError } from './useBlockaidError';
import { useFormattedQuoteData } from './useFormattedQuoteData';
import type { UseBridgeQuotesParams } from './types';

export interface UseQuoteDataParams extends UseBridgeQuotesParams {}

export const useQuoteData = ({
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
