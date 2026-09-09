import Engine from '../../../../../core/Engine';
import { debounce } from 'lodash';

import {
  type GenericQuoteRequest,
  isValidQuoteRequest,
  type FeatureId,
} from '@metamask/bridge-controller';
import { useCallback, useEffect, useMemo } from 'react';

import { useUnifiedSwapBridgeContext } from '../useUnifiedSwapBridgeContext';
import { swapQuoteFetchTrace } from '../../utils/swapQuoteFetchTrace';

export interface UseDebouncedUpdateParams {
  featureId: FeatureId;
  debounceWait: number;
  quoteRequestIndex?: number;
  quoteRequestCount?: number;
  genericQuoteRequest?: GenericQuoteRequest;
  /**
   * The raw source input amount before normalization into {@link GenericQuoteRequest.srcTokenAmount}
   */
  rawSrcAmount?: string;
}

interface UpdateQuoteParamsOptions {
  isRefresh?: boolean;
  traceId?: string;
}

/**
 * Hook for handling bridge quote request updates
 * @returns A debounced function to update quote parameters
 */
export const useUpdateQuoteParams = (params: UseDebouncedUpdateParams) => {
  const {
    genericQuoteRequest,
    featureId,
    quoteRequestIndex = 0,
    quoteRequestCount = 1,
    debounceWait,
    rawSrcAmount: srcAmount,
  } = params;

  const metricsContext = useUnifiedSwapBridgeContext(featureId);

  /**
   * Updates quote parameters in the bridge controller
   */
  const updateQuoteParams = useCallback(
    async (options: UpdateQuoteParamsOptions = {}) => {
      if (!genericQuoteRequest) {
        return;
      }

      const shouldTrace = isValidQuoteRequest(genericQuoteRequest);

      if (options?.traceId && !shouldTrace) {
        swapQuoteFetchTrace.finish('cancelled', options.traceId);
      }

      try {
        await Engine.context.BridgeController.updateBridgeQuoteRequestParams(
          genericQuoteRequest,
          metricsContext,
          quoteRequestIndex,
          quoteRequestCount,
        );
      } catch (error) {
        if (options?.traceId && shouldTrace) {
          swapQuoteFetchTrace.finish('error', options.traceId);
        }
        throw error;
      }
    },
    [metricsContext, quoteRequestIndex, quoteRequestCount, genericQuoteRequest],
  );

  const {
    srcChainId,
    destChainId,
    srcTokenAddress,
    destTokenAddress,
    walletAddress,
  } = genericQuoteRequest ?? {};

  // Start the trace when the user commits a request, before the debounce timer.
  const debouncedUpdateQuoteParams = useMemo(() => {
    const debounced = debounce(updateQuoteParams, debounceWait);

    const debouncedWithTrace = (
      requestOptions: UpdateQuoteParamsOptions = {},
    ) => {
      if (
        !srcTokenAddress ||
        !destTokenAddress ||
        // Checks if the input field has been cleared
        srcAmount === undefined ||
        !destChainId ||
        !walletAddress
      ) {
        debounced.cancel();
        swapQuoteFetchTrace.finish('cancelled');
        return;
      }

      const traceId =
        srcAmount && srcAmount !== '.'
          ? swapQuoteFetchTrace.start({
              srcChainId,
              destChainId,
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
    destChainId,
    srcChainId,
    destTokenAddress,
    srcTokenAddress,
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

  return useMemo(
    () => debouncedUpdateQuoteParams,
    [debouncedUpdateQuoteParams],
  );
};
