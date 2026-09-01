import React, { createContext, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { BigNumber as EthersBigNumber } from 'ethers';

import { selectBridgeControllerState } from '../../../../../core/redux/slices/bridge';
import { useValidQuotes } from '../useValidQuotes';
import { useBlockaidError } from '../useBlockaidError';
import { useFormattedQuoteData } from '../useFormattedQuoteData';

import { type GenericQuoteRequest } from '@metamask/bridge-controller';
import {
  useUpdateQuoteParams,
  type UseDebouncedUpdateParams,
} from '../useUpdateQuoteParams';
import { useLatestBalance } from '../useLatestBalance';
import useIsInsufficientBalance from '../useInsufficientBalance';
import { useInsufficientNativeReserveError } from '../useInsufficientNativeReserveError';
import { selectGasIncludedQuoteParams } from '../../../../../selectors/bridge';
import { buildGenericQuoteRequest } from './utils';

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

interface UseSwapQuotesParams {
  latestSourceAtomicBalance?: EthersBigNumber;
  quoteParams: Parameters<typeof buildGenericQuoteRequest>[0]['quoteParams'];
}

interface UseQuoteDataParams extends UseSwapQuotesParams {}

interface UseQuoteRequestParams
  extends UseSwapQuotesParams,
    UseDebouncedUpdateParams {}

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

  // Use simple balance check (ignoring gas fees) for quote requests to avoid circular dependencies.
  // The full balance check with gas fees is used separately within the BridgeView to block user from executing
  // the swap in insufficient balance.
  // This prevents the infinite loop: quote request → gas data changes → insufficientBal changes → new quote request
  const insufficientBalance = useIsInsufficientBalance({
    amount: srcAmount,
    token: srcToken,
    latestAtomicBalance: latestSourceAtomicBalance,
    ignoreGasFees: true,
  });

  // Build generic quote request params
  const insufficientNativeReserveError = useInsufficientNativeReserveError({
    amount: srcAmount,
    token: srcToken,
    latestAtomicBalance: latestSourceAtomicBalance,
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

  const debouncedUpdateQuoteParams = useUpdateQuoteParams({
    featureId: params.featureId,
    debounceWait: params.debounceWait,
    quoteRequestIndex: params.quoteRequestIndex,
    quoteRequestCount: params.quoteRequestCount,
    genericQuoteRequest,
    rawSrcAmount: srcAmount,
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
  const { quoteParams, latestSourceAtomicBalance } = params;
  // Presence (not truthiness): parent may pass undefined while its own
  // useLatestBalance is still loading. That must not start a second fetch.
  const hasLatestSourceBalanceOverride = 'latestSourceAtomicBalance' in params;

  // Fetch balance here and pass it to the request/response hooks
  const latestSourceBalance = useLatestBalance(
    hasLatestSourceBalanceOverride
      ? {}
      : {
          address: quoteParams.srcToken?.address,
          decimals: quoteParams.srcToken?.decimals,
          chainId: quoteParams.srcToken?.chainId,
          balance: quoteParams.srcToken?.balance,
        },
  );
  const latestAtomicBalance = hasLatestSourceBalanceOverride
    ? latestSourceAtomicBalance
    : latestSourceBalance?.atomicBalance;
  const resolvedParams = {
    ...params,
    latestSourceAtomicBalance: latestAtomicBalance,
  };

  const requestData = useQuoteRequest(resolvedParams);
  const quoteData = useQuoteData(resolvedParams);

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
