import { v4 as uuidv4 } from 'uuid';
import type { Hex } from '@metamask/utils';
import {
  formatAddressToAssetId,
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
import type { RootState } from '../../../../reducers';
import {
  FIRST_QUOTE_FLUSH_AB_KEY,
  IMMEDIATE_FIRST_QUOTE_FETCH_AB_KEY,
  YIELD_AFTER_FIRST_QUOTE_AB_KEY,
  selectFirstQuoteAbTestVariant,
} from './firstQuoteFlushAbTestConfig';
import { normalizeTokenAddress } from './tokenUtils';

export type SwapQuoteFetchTraceResult =
  | 'success'
  | 'cancelled'
  | 'no_quotes'
  | 'error';

interface StartSwapQuoteFetchTraceParams {
  srcChainId?: GenericQuoteRequest['srcChainId'];
  destChainId?: GenericQuoteRequest['destChainId'];
  srcTokenAddress?: GenericQuoteRequest['srcTokenAddress'];
  destTokenAddress?: GenericQuoteRequest['destTokenAddress'];
  isRefresh: boolean;
}

const toAssetId = (
  address?: string,
  chainId?: GenericQuoteRequest['srcChainId'],
): ReturnType<typeof formatAddressToAssetId> => {
  try {
    return address === undefined
      ? undefined
      : formatAddressToAssetId(
          normalizeTokenAddress(address, chainId as Hex),
          chainId,
        );
  } catch {
    return undefined;
  }
};

let activeTraceId: string | undefined;
let stopWatchingQuotes: (() => void) | undefined;

const unwatchQuotes = (): void => {
  try {
    stopWatchingQuotes?.();
  } catch {
    // Telemetry only.
  }
  stopWatchingQuotes = undefined;
};

// Reads phase times from Redux after each dispatch, so nothing runs inside the
// controller's quote processing. quotesLastFetched is set by the controller
// just before it fetches; quotes present at span start are stale.
const watchQuotePhases = (id: string, startTime: number): void => {
  try {
    const { store } = ReduxService;
    const getBridgeState = () =>
      (store.getState() as RootState).engine.backgroundState.BridgeController;
    const staleQuotes = getBridgeState().quotes;
    let requestSentMarked = false;
    stopWatchingQuotes = store.subscribe(() => {
      try {
        const { quotes, quotesLastFetched } = getBridgeState();
        const span = { name: TraceName.SwapQuoteFetch, id };
        if (!requestSentMarked && (quotesLastFetched ?? 0) >= startTime) {
          requestSentMarked = true;
          annotateTraceByRequest(span, {
            request_sent_ms: (quotesLastFetched ?? 0) - startTime,
          });
        }
        if (quotes.length > 0 && quotes !== staleQuotes) {
          annotateTraceByRequest(span, {
            first_quote_in_state_ms: Date.now() - startTime,
          });
          unwatchQuotes();
        }
      } catch {
        unwatchQuotes();
      }
    });
  } catch {
    stopWatchingQuotes = undefined;
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
  unwatchQuotes();
};

export const swapQuoteFetchTrace = {
  start({
    srcChainId,
    destChainId,
    srcTokenAddress,
    destTokenAddress,
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
    try {
      const state = ReduxService.store.getState();
      const srcToken = toAssetId(srcTokenAddress, srcChainId);
      const destToken = toAssetId(destTokenAddress, destChainId);
      annotateTraceByRequest(
        { name: TraceName.SwapQuoteFetch, id },
        {
          first_quote_flush_variant: selectFirstQuoteAbTestVariant(
            state,
            FIRST_QUOTE_FLUSH_AB_KEY,
          ),
          immediate_first_quote_fetch_variant: selectFirstQuoteAbTestVariant(
            state,
            IMMEDIATE_FIRST_QUOTE_FETCH_AB_KEY,
          ),
          yield_after_first_quote_variant: selectFirstQuoteAbTestVariant(
            state,
            YIELD_AFTER_FIRST_QUOTE_AB_KEY,
          ),
          ...(srcToken && { src_token: srcToken }),
          ...(destToken && { dest_token: destToken }),
          ...(srcToken &&
            destToken && { token_pair: `${srcToken}>${destToken}` }),
        },
      );
    } catch {
      // Telemetry only.
    }
    watchQuotePhases(id, startTime);
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
