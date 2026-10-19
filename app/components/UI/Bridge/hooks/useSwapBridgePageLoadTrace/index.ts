import { useEffect, useRef } from 'react';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import { endTrace, TraceName } from '../../../../../util/trace';
import type { BridgeToken } from '../../types';

interface UseSwapBridgePageLoadTraceParams {
  traceId?: string;
  sourceToken?: BridgeToken;
  destToken?: BridgeToken;
  latestSourceBalance?: unknown;
  sourceAmount?: string;
  isQuoteSurfaceReady?: boolean;
}

export const useSwapBridgePageLoadTrace = ({
  traceId,
  sourceToken,
  destToken,
  latestSourceBalance,
  sourceAmount,
  isQuoteSurfaceReady = false,
}: UseSwapBridgePageLoadTraceParams): void => {
  const completedTraceIdRef = useRef<string | undefined>(undefined);

  const isReady = Boolean(
    traceId &&
      sourceToken &&
      destToken &&
      latestSourceBalance !== undefined &&
      (!sourceAmount || isQuoteSurfaceReady),
  );

  useEffect(() => {
    if (!traceId || !isReady || completedTraceIdRef.current === traceId) {
      return;
    }

    endTrace({
      name: TraceName.SwapViewLoaded,
      id: traceId,
      timestamp: Date.now(),
      data: {
        result: 'success',
        ...(sourceToken?.chainId && {
          src_chain_id: formatChainIdToCaip(sourceToken.chainId),
        }),
        ...(destToken?.chainId && {
          dest_chain_id: formatChainIdToCaip(destToken.chainId),
        }),
      },
    });
    completedTraceIdRef.current = traceId;
  }, [destToken, isReady, sourceToken, traceId]);

  useEffect(
    () => () => {
      if (!traceId || completedTraceIdRef.current === traceId) {
        return;
      }

      endTrace({
        name: TraceName.SwapViewLoaded,
        id: traceId,
        timestamp: Date.now(),
        data: { result: 'cancelled' },
      });
      completedTraceIdRef.current = traceId;
    },
    [traceId],
  );
};
