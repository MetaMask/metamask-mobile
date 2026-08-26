import React, { createContext, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';

import { selectBridgeControllerState } from '../../../../../core/redux/slices/bridge';
import { useValidQuotes } from '../useValidQuotes';
import { useBlockaidError } from '../useBlockaidError';
import { useFormattedQuoteData } from '../useFormattedQuoteData';

import { type GenericQuoteRequest } from '@metamask/bridge-controller';
import {
  useDebouncedUpdate,
  type UseDebouncedUpdateParams,
} from './useDebouncedUpdate';
import type { UseSwapQuotesParams } from './types';
import { useLatestBalance } from '../useLatestBalance';
import useIsInsufficientBalance from '../useInsufficientBalance';
import { useInsufficientNativeReserveError } from '../useInsufficientNativeReserveError';
import { selectGasIncludedQuoteParams } from '../../../../../selectors/bridge';
import { buildGenericQuoteRequest } from './utils/buildQuoteRequest';

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

interface UseQuoteDataParams extends UseSwapQuotesParams {}

interface UseQuoteRequestParams
  extends UseSwapQuotesParams,
    Omit<UseDebouncedUpdateParams, 'genericQuoteRequest'> {}

/**
 * Hook for handling bridge quote request updates
 * @returns An object with a debounced function to update quote parameters and a function to refresh quotes
 */
const useQuoteRequest = (params: UseQuoteRequestParams) => {
  const { quoteParams, latestSourceAtomicBalance } = params;
  const {
    srcAmount,
    srcToken,
    destToken,
    walletAddress,
    destWalletAddress,
    slippage,
  } = quoteParams;

  // Presence (not truthiness): parent may pass undefined while its own
  // useLatestBalance is still loading. That must not start a second fetch.
  const hasLatestSourceBalanceOverride = 'latestSourceAtomicBalance' in params;
  const latestSourceBalance = useLatestBalance(
    hasLatestSourceBalanceOverride
      ? {}
      : {
          address: srcToken?.address,
          decimals: srcToken?.decimals,
          chainId: srcToken?.chainId,
          balance: srcToken?.balance,
        },
  );
  const latestAtomicBalance = hasLatestSourceBalanceOverride
    ? latestSourceAtomicBalance
    : latestSourceBalance?.atomicBalance;

  // Use simple balance check (ignoring gas fees) for quote requests to avoid circular dependencies.
  // The full balance check with gas fees is used separately within the BridgeView to block user from executing
  // the swap in insufficient balance.
  // This prevents the infinite loop: quote request → gas data changes → insufficientBal changes → new quote request
  const insufficientBalance = useIsInsufficientBalance({
    amount: srcAmount,
    token: srcToken,
    latestAtomicBalance,
    ignoreGasFees: true,
  });

  // Build generic quote request params
  const insufficientNativeReserveError = useInsufficientNativeReserveError({
    amount: srcAmount,
    token: srcToken,
    latestAtomicBalance,
    walletAddress,
  });

  const { gasIncluded, gasIncluded7702 } = useSelector(
    selectGasIncludedQuoteParams,
  );

  const genericQuoteRequest: GenericQuoteRequest | undefined = useMemo(
    () =>
      buildGenericQuoteRequest({
        quoteParams: {
          srcAmount,
          srcToken,
          destToken,
          walletAddress,
          destWalletAddress,
          slippage,
        },
        gasIncluded,
        gasIncluded7702,
        insufficientBalance,
        insufficientNativeReserveError: Boolean(insufficientNativeReserveError),
      }),
    [
      srcAmount,
      srcToken,
      destToken,
      walletAddress,
      destWalletAddress,
      slippage,
      gasIncluded,
      gasIncluded7702,
      insufficientBalance,
      insufficientNativeReserveError,
    ],
  );

  const debouncedUpdateQuoteParams = useDebouncedUpdate({
    featureId: params.featureId,
    debounceWait: params.debounceWait,
    traceName: params.traceName,
    quoteRequestIndex: params.quoteRequestIndex,
    quoteRequestCount: params.quoteRequestCount,
    quoteParams: params.quoteParams,
    genericQuoteRequest,
  });

  const refreshQuotes = useCallback(() => {
    debouncedUpdateQuoteParams({ isRefresh: true });
  }, [debouncedUpdateQuoteParams]);

  return useMemo(
    () => ({
      refreshQuotes,
      debouncedUpdateQuoteParams,
    }),
    [refreshQuotes, debouncedUpdateQuoteParams],
  );
};

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
