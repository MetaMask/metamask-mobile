import { useSelector } from 'react-redux';
import Engine from '../../../../../core/Engine';
import { debounce } from 'lodash';

import {
  type GenericQuoteRequest,
  isValidQuoteRequest,
  type FeatureId,
} from '@metamask/bridge-controller';
import { useCallback, useEffect, useMemo } from 'react';

import useIsInsufficientBalance from '../useInsufficientBalance';

import { useInsufficientNativeReserveError } from '../useInsufficientNativeReserveError';
import { selectGasIncludedQuoteParams } from '../../../../../selectors/bridge';
import { TraceName } from '../../../../../util/trace';
import { useLatestBalance } from '../useLatestBalance';
import { useUnifiedSwapBridgeContext } from '../useUnifiedSwapBridgeContext';
import { swapQuoteFetchTrace } from '../../utils/swapQuoteFetchTrace';
import type { UseBridgeQuotesParams } from './types';
import { buildGenericQuoteRequest } from './utils/buildQuoteRequest';

export interface UseQuoteRequestParams extends UseBridgeQuotesParams {
  featureId: FeatureId;
  debounceWait: number;
  traceName?: TraceName;
  quoteRequestIndex?: number;
  quoteRequestCount?: number;
}

interface UpdateQuoteParamsOptions {
  isRefresh?: boolean;
  traceId?: string;
}

/**
 * Hook for handling bridge quote request updates
 * @returns An object with a debounced function to update quote parameters and a function to refresh quotes
 */
export const useQuoteRequest = (params: UseQuoteRequestParams) => {
  const {
    traceName,
    quoteParams,
    latestSourceAtomicBalance,
    debounceWait,
    quoteRequestIndex = 0,
    quoteRequestCount = 1,
    featureId,
  } = params;
  const { srcAmount, srcToken, destToken, walletAddress } = quoteParams;

  const metricsContext = useUnifiedSwapBridgeContext(featureId);

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

  const quoteRequestParams: GenericQuoteRequest | undefined = useMemo(
    () =>
      buildGenericQuoteRequest({
        quoteParams,
        gasIncluded,
        gasIncluded7702,
        insufficientBalance,
        insufficientNativeReserveError: Boolean(insufficientNativeReserveError),
      }),
    [
      quoteParams,
      gasIncluded,
      gasIncluded7702,
      insufficientBalance,
      insufficientNativeReserveError,
    ],
  );

  /**
   * Updates quote parameters in the bridge controller
   */
  const updateQuoteParams = useCallback(
    async (options?: UpdateQuoteParamsOptions) => {
      if (!quoteRequestParams) {
        return;
      }

      const shouldTrace =
        isValidQuoteRequest(quoteRequestParams) && Boolean(traceName);

      if (options?.traceId && !shouldTrace) {
        swapQuoteFetchTrace.finish('cancelled', options.traceId);
      }

      try {
        await Engine.context.BridgeController.updateBridgeQuoteRequestParams(
          quoteRequestParams,
          metricsContext,
          quoteRequestIndex,
          quoteRequestCount,
        );
      } catch (error) {
        if (shouldTrace) {
          swapQuoteFetchTrace.finish('error', options?.traceId);
        }
        throw error;
      }
    },
    [
      metricsContext,
      quoteRequestIndex,
      quoteRequestCount,
      traceName,
      quoteRequestParams,
    ],
  );

  // Start the trace when the user commits a request, before the debounce timer.
  const debouncedUpdateQuoteParams = useMemo(() => {
    const debounced = debounce(updateQuoteParams, debounceWait);

    const debouncedWithTrace = (
      requestOptions: UpdateQuoteParamsOptions = {},
    ) => {
      if (
        !srcToken ||
        !destToken ||
        srcAmount === undefined ||
        !walletAddress
      ) {
        debounced.cancel();
        swapQuoteFetchTrace.finish('cancelled');
        return;
      }

      const traceId =
        srcAmount && srcAmount !== '.'
          ? swapQuoteFetchTrace.start({
              sourceToken: srcToken,
              destToken,
              isRefresh: requestOptions.isRefresh ?? false,
            })
          : undefined;

      if (!traceId) {
        swapQuoteFetchTrace.finish('cancelled');
      }

      debounced({
        ...requestOptions,
        traceId,
      });
    };

    debouncedWithTrace.cancel = () => {
      debounced.cancel();
      swapQuoteFetchTrace.finish('cancelled');
    };
    debouncedWithTrace.flush = () => debounced.flush();

    return debouncedWithTrace;
  }, [
    destToken,
    srcToken,
    srcAmount,
    updateQuoteParams,
    walletAddress,
    debounceWait,
  ]);

  useEffect(
    () => () => {
      debouncedUpdateQuoteParams.cancel();
    },
    [debouncedUpdateQuoteParams],
  );

  const refreshQuotes = useCallback(() => {
    debouncedUpdateQuoteParams({ isRefresh: true });
  }, [debouncedUpdateQuoteParams]);

  return useMemo(
    () => ({
      refreshQuotes,
      /** @deprecated update quoteRequest state through an internal useEffect hook instead */
      debouncedUpdateQuoteParams,
    }),
    [refreshQuotes, debouncedUpdateQuoteParams],
  );
};
