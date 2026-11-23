import { v4 as uuidv4 } from 'uuid';
import {
  formatChainIdToCaip,
  SwapFeatureTag,
} from '@metamask/bridge-controller';
import { trace, TraceName, TraceOperation } from '../../../../util/trace';
import type { DeeplinkPerfAppStartType } from '../../../../core/Performance/DeeplinkPerformance';
import type { BridgeToken, BridgeViewMode } from '../types';

export interface SwapBridgePageLoadTraceRoute {
  sourcePage: string;
  bridgeViewMode: BridgeViewMode;
  sourceToken?: BridgeToken;
  destToken?: BridgeToken;
  sourceAmount?: string;
}

/**
 * @param route - Bridge route params; the trace id is added to the result.
 * @param options.appStartType - `cold` when Bridge opens through the startup
 * deeplink path (reset to home), `warm` for every other navigation.
 */
export const startSwapBridgePageLoadTrace = <
  T extends SwapBridgePageLoadTraceRoute,
>(
  route: T,
  { appStartType = 'warm' }: { appStartType?: DeeplinkPerfAppStartType } = {},
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
      app_start_type: appStartType,
      ...(srcChainId && { src_chain_id: srcChainId }),
      ...(destChainId && { dest_chain_id: destChainId }),
    },
    startTime: Date.now(),
    tags: { feature: SwapFeatureTag.SWAP },
  });

  return { ...route, swapViewTraceId: id };
};
