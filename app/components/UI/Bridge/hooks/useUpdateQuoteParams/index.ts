import Engine from '../../../../../core/Engine';
import { debounce } from 'lodash';

import {
  type GenericQuoteRequest,
  isValidQuoteRequest,
  type FeatureId,
} from '@metamask/bridge-controller';
import { useCallback, useEffect, useMemo, useRef } from 'react';

import { useUnifiedSwapBridgeContext } from '../useUnifiedSwapBridgeContext';
import { swapQuoteFetchTrace } from '../../utils/swapQuoteFetchTrace';

export interface UseDebouncedUpdateParams {
  featureId: FeatureId;
  debounceWait: number;
  quoteRequestIndex?: number;
  quoteRequestCount?: number;
  genericQuoteRequest?: Partial<GenericQuoteRequest> & {
    walletAddress: string;
  };
  isActive: boolean;
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
  const ownedTraceId = useRef<string | undefined>(undefined);
  const cancelOwnedTrace = useCallback(() => {
    if (ownedTraceId.current) {
      swapQuoteFetchTrace.finish('cancelled', ownedTraceId.current);
      ownedTraceId.current = undefined;
    }
  }, []);

  const {
    genericQuoteRequest,
    featureId,
    quoteRequestIndex = 0,
    quoteRequestCount = 1,
    debounceWait,
    rawSrcAmount: srcAmount,
    isActive,
  } = params;

  useEffect(
    () => (isActive ? cancelOwnedTrace : undefined),
    [cancelOwnedTrace, isActive],
  );

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

  const { srcChainId, destChainId } = genericQuoteRequest ?? {};

  const debouncedUpdateQuoteParams = useMemo(() => {
    const debounced = debounce(
      (requestOptions: UpdateQuoteParamsOptions = {}) => {
        if (
          !genericQuoteRequest ||
          // if quoteRequest has no src amount, don't trace
          !isValidQuoteRequest(genericQuoteRequest, true)
        ) {
          cancelOwnedTrace();
          return updateQuoteParams(requestOptions);
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
          cancelOwnedTrace();
        } else {
          ownedTraceId.current = traceId;
        }

        return updateQuoteParams({ ...requestOptions, traceId });
      },
      debounceWait,
    );

    const debouncedWithTrace = (
      requestOptions: UpdateQuoteParamsOptions = {},
    ) => {
      if (
        !genericQuoteRequest ||
        !isValidQuoteRequest(genericQuoteRequest, false)
      ) {
        debounced.cancel();
        cancelOwnedTrace();
        return;
      }

      debounced(requestOptions);
    };

    debouncedWithTrace.cancel = () => {
      debounced.cancel();
    };
    debouncedWithTrace.flush = () => debounced.flush();

    return debouncedWithTrace;
  }, [
    cancelOwnedTrace,
    destChainId,
    srcChainId,
    srcAmount,
    updateQuoteParams,
    debounceWait,
    genericQuoteRequest,
  ]);

  // Pass quoteParams to the bridge-controller
  useEffect(() => {
    if (!isActive) return;

    debouncedUpdateQuoteParams();

    return () => {
      debouncedUpdateQuoteParams.cancel();
    };
  }, [debouncedUpdateQuoteParams, isActive]);

  return useMemo(
    () => debouncedUpdateQuoteParams,
    [debouncedUpdateQuoteParams],
  );
};
