import { v4 as uuidv4 } from 'uuid';
import {
  formatChainIdToCaip,
  SwapFeatureTag,
  type GenericQuoteRequest,
  type QuoteStreamCompleteReason,
} from '@metamask/bridge-controller';
import {
  annotateTraceByRequest,
  endTrace,
  trace,
  TraceName,
  TraceOperation,
} from '../../../../util/trace';
import ReduxService from '../../../../core/redux';
import { selectRemoteFeatureFlags } from '../../../../selectors/featureFlagController';

export type SwapQuoteFetchTraceResult =
  | 'success'
  | 'cancelled'
  | 'no_quotes'
  | 'error';

interface StartSwapQuoteFetchTraceParams {
  srcChainId?: GenericQuoteRequest['srcChainId'];
  destChainId?: GenericQuoteRequest['destChainId'];
  isRefresh: boolean;
}

let activeTraceId: string | undefined;

const finishTrace = (
  result: SwapQuoteFetchTraceResult,
  id: string | undefined = activeTraceId,
  reason?: QuoteStreamCompleteReason,
): void => {
  if (!id || activeTraceId !== id) {
    return;
  }

  endTrace({
    name: TraceName.SwapQuoteFetch,
    id,
    timestamp: Date.now(),
    data: {
      result,
      ...(result === 'no_quotes' || result === 'error'
        ? { no_quote_reason: reason ?? 'generic_error' }
        : {}),
    },
  });
  activeTraceId = undefined;
};

export const swapQuoteFetchTrace = {
  start({
    srcChainId,
    destChainId,
    isRefresh,
  }: StartSwapQuoteFetchTraceParams): string {
    if (activeTraceId) {
      finishTrace('cancelled');
    }

    const id = uuidv4();
    const srcChainIdInCaip = srcChainId
      ? formatChainIdToCaip(srcChainId)
      : undefined;
    const destChainIdInCaip = destChainId
      ? formatChainIdToCaip(destChainId)
      : undefined;
    let swapType: 'single_chain' | 'crosschain' | undefined;
    if (srcChainIdInCaip && destChainIdInCaip) {
      swapType =
        srcChainIdInCaip === destChainIdInCaip ? 'single_chain' : 'crosschain';
    }
    trace({
      name: TraceName.SwapQuoteFetch,
      op: TraceOperation.BridgeDataFetch,
      id,
      data: {
        request_id: id,
        isRefresh,
        ...(swapType && { swap_type: swapType }),
        ...(srcChainIdInCaip && {
          src_chain_id: srcChainIdInCaip,
        }),
        ...(destChainIdInCaip && {
          dest_chain_id: destChainIdInCaip,
        }),
      },
      startTime: Date.now(),
      tags: { feature: SwapFeatureTag.SWAP },
    });
    activeTraceId = id;
    annotateTraceByRequest(
      { name: TraceName.SwapQuoteFetch, id },
      {
        first_quote_flush_enabled:
          selectRemoteFeatureFlags(ReduxService.store.getState())
            .bridgeFirstQuoteFlushEnabled === true,
      },
    );
    return id;
  },

  finish(
    result: SwapQuoteFetchTraceResult,
    id?: string,
    reason?: QuoteStreamCompleteReason,
  ): void {
    finishTrace(result, id, reason);
  },
};
