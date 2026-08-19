import { useDispatch, useSelector } from 'react-redux';
import Engine from '../../../../../core/Engine';
import { debounce } from 'lodash';

import {
  type GenericQuoteRequest,
  isValidQuoteRequest,
  type FeatureId,
} from '@metamask/bridge-controller';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import useIsInsufficientBalance from '../useInsufficientBalance';
import { BigNumber as EthersBigNumber } from 'ethers';

import type { BridgeToken } from '../../types';
import { useInsufficientNativeReserveError } from '../useInsufficientNativeReserveError';
import { selectGasIncludedQuoteParams } from '../../../../../selectors/bridge';

import { calcTokenValue } from '../../../../../util/transactions';
import { TraceName, endTrace, trace } from '../../../../../util/trace';
import { useLatestBalance } from '../useLatestBalance';
import { useUnifiedSwapBridgeContext } from '../useUnifiedSwapBridgeContext';

interface UseBridgeQuotesParams {
  latestSourceAtomicBalance?: EthersBigNumber;
  quoteParams: {
    srcAmount?: string;
    srcToken?: BridgeToken;
    destToken?: BridgeToken;
    walletAddress?: string;
    destWalletAddress?: string;
    slippage?: string;
  };
}

export interface UseQuoteRequestParams extends UseBridgeQuotesParams {
  featureId: FeatureId;
  debounceWait: number;
  traceName?: TraceName;
  quoteRequestIndex?: number;
  quoteRequestCount?: number;
}

/**
 * Hook for handling bridge quote request updates
 * @returns An object with a debounced function to update quote parameters and a function to refresh quotes
 */
export const useQuoteRequest = ({
  traceName,
  quoteParams,
  latestSourceAtomicBalance,
  debounceWait,
  quoteRequestIndex = 0,
  quoteRequestCount = 1,
  featureId,
}: UseQuoteRequestParams) => {
  const {
    srcAmount,
    srcToken,
    destToken,
    walletAddress,
    destWalletAddress,
    slippage,
  } = quoteParams;

  const latestSourceBalance = useLatestBalance(
    latestSourceAtomicBalance
      ? {}
      : {
          address: srcToken?.address,
          decimals: srcToken?.decimals,
          chainId: srcToken?.chainId,
          balance: srcToken?.balance,
        },
  );
  const latestAtomicBalance =
    latestSourceAtomicBalance ?? latestSourceBalance?.atomicBalance;

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

  const { gasIncluded, gasIncluded7702 } = useSelector(
    selectGasIncludedQuoteParams,
  );

  const insufficientNativeReserveError = useInsufficientNativeReserveError({
    amount: srcAmount,
    token: srcToken,
    latestAtomicBalance,
    walletAddress,
  });

  const insufficientBal =
    insufficientBalance || Boolean(insufficientNativeReserveError);

  const quoteRequestParams: GenericQuoteRequest | undefined = useMemo(() => {
    if (!walletAddress || !srcToken || !destToken || srcAmount === undefined) {
      return;
    }
    const normalizedSourceAmount =
      srcAmount && srcToken?.decimals
        ? calcTokenValue(
            srcAmount === '.' ? '0' : srcAmount || '0',
            srcToken.decimals,
          ).toFixed(0)
        : '0';

    const slippageNumber = slippage ? Number(slippage) : undefined;

    return {
      srcChainId: srcToken?.chainId,
      srcTokenAddress: srcToken?.address,
      destChainId: destToken?.chainId,
      destTokenAddress: destToken?.address,
      srcTokenAmount: normalizedSourceAmount,
      slippage: Number.isNaN(slippageNumber) ? undefined : slippageNumber,
      walletAddress,
      destWalletAddress,
      gasIncluded,
      gasIncluded7702,
      insufficientBal,
    };
  }, [
    srcToken,
    destToken,
    srcAmount,
    walletAddress,
    destWalletAddress,
    slippage,
    gasIncluded,
    gasIncluded7702,
    insufficientBal,
  ]);

  const context = useUnifiedSwapBridgeContext(featureId);

  /**
   * Updates quote parameters in the bridge controller
   */
  const updateQuoteParams = useCallback(
    async (options?: { isRefresh?: boolean }, params?: GenericQuoteRequest) => {
      const paramsToUse = params ?? quoteRequestParams;
      if (!paramsToUse) {
        return;
      }

      const shouldTrace = isValidQuoteRequest(paramsToUse) && traceName;

      try {
        if (shouldTrace) {
          trace({
            name: traceName,
            data: { isRefresh: options?.isRefresh ?? false },
            startTime: Date.now(),
          });
        }

        await Engine.context.BridgeController.updateBridgeQuoteRequestParams(
          paramsToUse,
          context,
          quoteRequestIndex,
          quoteRequestCount,
        );
      } catch (error) {
        if (shouldTrace) {
          endTrace({
            name: traceName,
            timestamp: Date.now(),
            data: { success: false },
          });
        }
        throw error;
      }
    },
    [
      context,
      quoteRequestIndex,
      quoteRequestCount,
      traceName,
      quoteRequestParams,
    ],
  );

  // Create a stable debounced function that persists across renders
  const debouncedUpdateQuoteParams = useMemo(
    () => debounce(updateQuoteParams, debounceWait),
    [updateQuoteParams],
  );

  const refreshQuotes = useCallback(() => {
    debouncedUpdateQuoteParams({ isRefresh: true }, quoteRequestParams);
  }, [debouncedUpdateQuoteParams, quoteRequestParams]);

  return useMemo(
    () => ({
      refreshQuotes,
      /** @deprecated update quoteRequest state through an internal useEffect hook instead */
      debouncedUpdateQuoteParams,
    }),
    [refreshQuotes, debouncedUpdateQuoteParams],
  );
};
