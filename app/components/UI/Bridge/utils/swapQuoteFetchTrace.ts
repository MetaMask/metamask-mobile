import { v4 as uuidv4 } from 'uuid';
import {
  formatChainIdToCaip,
  SwapFeatureTag,
  type GenericQuoteRequest,
  type QuoteStreamCompleteReason,
} from '@metamask/bridge-controller';
import {
  endTrace,
  trace,
  TraceName,
  TraceOperation,
} from '../../../../util/trace';
import ReduxService from '../../../../core/redux';
import type { RootState } from '../../../../reducers';

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

// Phase offsets in ms from span start, attached as span attributes on finish.
interface PhaseMarks {
  request_sent_ms?: number;
  first_quote_in_state_ms?: number;
}

let activeTraceId: string | undefined;
let activeStartTime = 0;
let phaseMarks: PhaseMarks = {};
let unsubscribeFromStore: (() => void) | undefined;

const getReduxQuotes = (): unknown[] | undefined =>
  (ReduxService.store.getState() as RootState).engine?.backgroundState
    ?.BridgeController?.quotes;

const stopWatchingStore = (): void => {
  try {
    unsubscribeFromStore?.();
  } catch {
    // Telemetry only.
  }
  unsubscribeFromStore = undefined;
};

// Runs after each Redux dispatch, not inside the controller's quote handling.
// Quotes from a previous request are excluded by comparing against the array
// reference present when the span started.
const watchFirstQuoteInState = (id: string): void => {
  stopWatchingStore();
  try {
    const baselineQuotes = getReduxQuotes();
    unsubscribeFromStore = ReduxService.store.subscribe(() => {
      try {
        if (
          activeTraceId !== id ||
          phaseMarks.first_quote_in_state_ms !== undefined
        ) {
          stopWatchingStore();
          return;
        }
        const quotes = getReduxQuotes();
        if (quotes && quotes.length > 0 && quotes !== baselineQuotes) {
          phaseMarks.first_quote_in_state_ms = Date.now() - activeStartTime;
          stopWatchingStore();
        }
      } catch {
        stopWatchingStore();
      }
    });
  } catch {
    unsubscribeFromStore = undefined;
  }
};

const finishTrace = (
  result: SwapQuoteFetchTraceResult,
  id: string | undefined = activeTraceId,
  reason?: QuoteStreamCompleteReason,
): void => {
  if (!id || activeTraceId !== id) {
    return;
  }

  const endTime = Date.now();
  endTrace({
    name: TraceName.SwapQuoteFetch,
    id,
    timestamp: endTime,
    data: {
      result,
      ...(result === 'no_quotes' || result === 'error'
        ? { no_quote_reason: reason ?? 'generic_error' }
        : {}),
      ...phaseMarks,
      ...(result === 'success'
        ? { first_quote_rendered_ms: endTime - activeStartTime }
        : {}),
    },
  });
  activeTraceId = undefined;
  phaseMarks = {};
  stopWatchingStore();
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
    const startTime = Date.now();
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
      startTime,
      tags: { feature: SwapFeatureTag.SWAP },
    });
    activeTraceId = id;
    activeStartTime = startTime;
    phaseMarks = {};
    watchFirstQuoteInState(id);
    return id;
  },

  /**
   * Records when BridgeController has accepted the request params and started
   * polling, i.e. when the quote request is handed off to the controller.
   */
  markRequestSent(id: string): void {
    if (activeTraceId !== id || phaseMarks.request_sent_ms !== undefined) {
      return;
    }
    phaseMarks.request_sent_ms = Date.now() - activeStartTime;
  },

  finish(
    result: SwapQuoteFetchTraceResult,
    id?: string,
    reason?: QuoteStreamCompleteReason,
  ): void {
    finishTrace(result, id, reason);
  },
};
