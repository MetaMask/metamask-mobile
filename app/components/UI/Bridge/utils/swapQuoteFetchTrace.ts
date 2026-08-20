import { v4 as uuidv4 } from 'uuid';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import { endTrace, trace, TraceName } from '../../../../util/trace';
import type { BridgeToken } from '../types';

export type SwapQuoteFetchTraceResult =
  | 'success'
  | 'cancelled'
  | 'no_quotes'
  | 'error';

interface StartSwapQuoteFetchTraceParams {
  sourceToken?: BridgeToken;
  destToken?: BridgeToken;
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
    sourceToken,
    destToken,
    isRefresh,
  }: StartSwapQuoteFetchTraceParams): string {
    if (activeTraceId) {
      finishTrace('cancelled');
    }

    const id = uuidv4();
    const srcChainId = sourceToken?.chainId
      ? formatChainIdToCaip(sourceToken.chainId)
      : undefined;
    const destChainId = destToken?.chainId
      ? formatChainIdToCaip(destToken.chainId)
      : undefined;
    let swapType: 'single_chain' | 'crosschain' | undefined;
    if (srcChainId && destChainId) {
      swapType = srcChainId === destChainId ? 'single_chain' : 'crosschain';
    }
    trace({
      name: TraceName.SwapQuoteFetch,
      id,
      data: {
        request_id: id,
        isRefresh,
        ...(swapType && { swap_type: swapType }),
        ...(sourceToken?.chainId && {
          src_chain_id: formatChainIdToCaip(sourceToken.chainId),
        }),
        ...(destToken?.chainId && {
          dest_chain_id: formatChainIdToCaip(destToken.chainId),
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
