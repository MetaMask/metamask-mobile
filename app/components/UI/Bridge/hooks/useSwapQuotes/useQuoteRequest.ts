import { useSelector } from 'react-redux';

import { type GenericQuoteRequest } from '@metamask/bridge-controller';
import { useCallback, useMemo } from 'react';

import useIsInsufficientBalance from '../useInsufficientBalance';

import { useInsufficientNativeReserveError } from '../useInsufficientNativeReserveError';
import { selectGasIncludedQuoteParams } from '../../../../../selectors/bridge';
import { useLatestBalance } from '../useLatestBalance';
import type { UseBridgeQuotesParams } from './types';
import { buildGenericQuoteRequest } from './utils/buildQuoteRequest';
import {
  useDebouncedUpdate,
  type UseDebouncedUpdateParams,
} from './useDebouncedUpdate';

export interface UseQuoteRequestParams
  extends UseBridgeQuotesParams,
    Omit<UseDebouncedUpdateParams, 'genericQuoteRequest'> {}

/**
 * Hook for handling bridge quote request updates
 * @returns An object with a debounced function to update quote parameters and a function to refresh quotes
 */
export const useQuoteRequest = (params: UseQuoteRequestParams) => {
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
