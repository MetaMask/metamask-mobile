import { v4 as uuidv4 } from 'uuid';
import {
  formatChainIdToCaip,
  type GenericQuoteRequest,
} from '@metamask/bridge-controller';
import {
  endTrace,
  trace,
  TraceName,
  TraceOperation,
} from '../../../../util/trace';

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
): void => {
  if (!id || activeTraceId !== id) {
    return;
  }

  endTrace({
    name: TraceName.SwapQuoteFetch,
    id,
    timestamp: Date.now(),
    data: { result },
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
    });
    activeTraceId = id;
    return id;
  },

  finish(result: SwapQuoteFetchTraceResult, id?: string): void {
    finishTrace(result, id);
  },
};
