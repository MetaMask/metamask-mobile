import React, { createContext, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { BigNumber as EthersBigNumber } from 'ethers';

import { selectBridgeControllerState } from '../../../../../core/redux/slices/bridge';
import { useValidQuotes } from '../useValidQuotes';
import { useBlockaidError } from '../useBlockaidError';
import { useFormattedQuoteData } from '../useFormattedQuoteData';

import {
  FeatureId,
  type GenericQuoteRequest,
} from '@metamask/bridge-controller';
import {
  useUpdateQuoteParams,
  type UseDebouncedUpdateParams,
} from '../useUpdateQuoteParams';
import { useLatestBalance } from '../useLatestBalance';
import useIsInsufficientBalance from '../useInsufficientBalance';
import { useInsufficientNativeReserveError } from '../useInsufficientNativeReserveError';
import { selectGasIncludedQuoteParams } from '../../../../../selectors/bridge';
import { buildGenericQuoteRequest } from './utils';
import { useBridgeSession } from '../useBridgeSession';
import { useSwapFeatureId } from '../useSwapFeatureId';
import {
  DEBOUNCE_WAIT,
  MIGRATED_FEATURE_IDS,
} from '../../Views/BridgeView/BridgeView.constants';

export type SwapQuotesContextValue = ReturnType<typeof useQuoteRequest> &
  ReturnType<typeof useQuoteData>;

export const SwapQuotesContext = createContext<SwapQuotesContextValue | null>(
  null,
);

interface UseSwapQuotesParams {
  latestSourceAtomicBalance?: EthersBigNumber;
  quoteParams: Parameters<typeof buildGenericQuoteRequest>[0]['quoteParams'];
}

interface UseQuoteDataParams extends UseSwapQuotesParams {
  /**
   * Whether this is the quote source for the rendered tab. The other quote
   * provider stays mounted to keep the tree stable, this flag skips
   * expensive computations.
   */
  isActive?: boolean;
}

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

  const genericQuoteRequest = useMemo(
    (): GenericQuoteRequest | undefined =>
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
  isActive,
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
  } = useValidQuotes({ latestSourceAtomicBalance, isActive, quoteParams });

  // Validate solana quotes
  const blockaidError = useBlockaidError({ activeQuote, isActive });

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

export const SwapQuotesProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { quoteParams, latestSourceBalance: latestSourceBalanceFromParent } =
    useBridgeSession();
  // Presence (not truthiness): parent may pass undefined while its own
  // useLatestBalance is still loading. That must not start a second fetch.
  const hasLatestSourceBalanceOverride = Boolean(latestSourceBalanceFromParent);
  const featureId = useSwapFeatureId();

  const isActive = MIGRATED_FEATURE_IDS.includes(featureId);
  // Fetch balance here and pass it to the request/response hooks
  const latestSourceBalance = useLatestBalance(
    hasLatestSourceBalanceOverride || !isActive
      ? {}
      : {
          address: quoteParams.srcToken?.address,
          decimals: quoteParams.srcToken?.decimals,
          chainId: quoteParams.srcToken?.chainId,
          balance: quoteParams.srcToken?.balance,
        },
  );
  const latestAtomicBalance = hasLatestSourceBalanceOverride
    ? latestSourceBalanceFromParent?.atomicBalance
    : latestSourceBalance?.atomicBalance;
  const resolvedParams = {
    quoteParams,
    featureId,
    latestSourceAtomicBalance: latestAtomicBalance,
    debounceWait: DEBOUNCE_WAIT,
  };

  const requestData = useQuoteRequest(resolvedParams);
  const quoteData = useQuoteData({
    ...resolvedParams,
    isActive,
  });

  const value = useMemo(
    () => ({ ...requestData, ...quoteData }),
    [requestData, quoteData],
  );

  return (
    <SwapQuotesContext.Provider value={value}>
      {children}
    </SwapQuotesContext.Provider>
  );
};
