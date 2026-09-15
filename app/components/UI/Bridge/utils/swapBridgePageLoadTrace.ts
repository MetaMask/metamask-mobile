import { v4 as uuidv4 } from 'uuid';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import { trace, TraceName, TraceOperation } from '../../../../util/trace';
import type { BridgeToken, BridgeViewMode } from '../types';

export interface SwapBridgePageLoadTraceRoute {
  sourcePage: string;
  bridgeViewMode: BridgeViewMode;
  sourceToken?: BridgeToken;
  destToken?: BridgeToken;
  sourceAmount?: string;
}

export const startSwapBridgePageLoadTrace = <
  T extends SwapBridgePageLoadTraceRoute,
>(
  route: T,
): T & { swapViewTraceId: string } => {
  const id = uuidv4();
  const srcChainId = route.sourceToken?.chainId
    ? formatChainIdToCaip(route.sourceToken.chainId)
    : undefined;
  const destChainId = route.destToken?.chainId
    ? formatChainIdToCaip(route.destToken.chainId)
    : undefined;

  trace({
    name: TraceName.SwapViewLoaded,
    op: TraceOperation.BridgeScreenPerformance,
    id,
    data: {
      entry_point: route.sourcePage,
      view_mode: route.bridgeViewMode,
      prefilled_amount: Boolean(route.sourceAmount),
      ...(srcChainId && { src_chain_id: srcChainId }),
      ...(destChainId && { dest_chain_id: destChainId }),
    },
    startTime: Date.now(),
  });

  return { ...route, swapViewTraceId: id };
};
