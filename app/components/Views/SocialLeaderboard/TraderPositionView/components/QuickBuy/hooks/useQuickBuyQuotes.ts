import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector, shallowEqual } from 'react-redux';
import { debounce } from 'lodash';
import {
  formatAddressToCaipReference,
  isNonEvmChainId,
  selectBridgeQuotes as selectBridgeQuotesBase,
  SortOrder,
  type BridgeAppState,
  type GenericQuoteRequest,
  type L1GasFees,
  type NonEvmFees,
  type QuoteResponse,
} from '@metamask/bridge-controller';
import type { RootState } from '../../../../../../../reducers';
import Engine from '../../../../../../../core/Engine';
import type { BridgeToken } from '../../../../../../UI/Bridge/types';
import { fromTokenMinimalUnit } from '../../../../../../../util/number/bigint';
import { areAddressesEqual } from '../../../../../../../util/address';
import { calcTokenValue } from '../../../../../../../util/transactions';
import { analytics } from '../../../../../../../util/analytics/analytics';
import { selectRemoteFeatureFlags } from '../../../../../../../selectors/featureFlagController';
import { selectSocialAIQuickBuyStreamQuotesEnabled } from '../../../../../../../selectors/featureFlagController/socialLeaderboard';
import {
  selectBridgeFeatureFlags,
  selectDestAddress,
  selectSlippage,
} from '../../../../../../../core/redux/slices/bridge';
import {
  selectGasIncludedQuoteParams,
  selectSourceWalletAddress,
} from '../../../../../../../selectors/bridge';
import { getDecimalChainId } from '../../../../../../../util/networks';
import Logger from '../../../../../../../util/Logger';
import { buildSocialLoggerErrorOptions } from '../../../../../../../util/social/socialServiceTelemetry';
import {
  QuickBuyEventProperties,
  buildQuickBuySharedAnalyticsProperties,
  type QuickBuyOriginalEntryPoint,
  type QuickBuySheetSource,
} from '../analytics';
import { useSocialLeaderboardAnalytics } from '../../../../analytics';
import { MetaMetricsEvents } from '../../../../../../../core/Analytics';
import { getQuoteRefreshRate } from '../../../../../../UI/Bridge/utils/quoteUtils';
import { getQuickBuyFeatureId } from '../utils/getQuickBuyFeatureId';
import {
  isQuoteStreamingEnabled,
  streamQuickBuyQuotes,
} from '../utils/streamQuickBuyQuotes';

export type QuickBuyQuote = QuoteResponse & L1GasFees & NonEvmFees;

export interface QuickBuyQuotesAnalyticsContext {
  /** Wallet address of the trader being copied. */
  traderAddress?: string;
  /** CAIP-19 of the destination token. */
  caip19?: string;
  /** USD amount the user has selected; used as `amount_usd`. */
  amountUsd?: number;
  /** Entry surface for FeatureId mapping on fetchQuotes. */
  source?: QuickBuySheetSource;
  /** Trade-screen entry attribution when hosted on TraderPositionView. */
  originalEntryPoint?: QuickBuyOriginalEntryPoint;
}

export type EnrichedQuickBuyQuote = ReturnType<
  typeof selectBridgeQuotesBase
>['sortedQuotes'][number];

export const QUICK_BUY_QUOTE_DEBOUNCE_MS = 300;

interface UseQuickBuyQuotesParams {
  sourceToken: BridgeToken | undefined;
  destToken: BridgeToken | undefined;
  sourceTokenAmount: string | undefined;
  analyticsContext?: QuickBuyQuotesAnalyticsContext;
  /** When set, overrides the recommended quote with the quote matching this requestId. */
  selectedQuoteRequestId?: string;
  /**
   * Monotonic nonce bumped by the consumer when the amount change is a
   * committed value (e.g. a slider release) rather than rapidly-changing input
   * (e.g. typing). When it increments, the pending debounce is flushed so the
   * quote fetch fires immediately instead of waiting out the typing debounce.
   */
  immediateFetchToken?: number;
}

export interface UseQuickBuyQuotesResult {
  activeQuote: EnrichedQuickBuyQuote | undefined;
  sortedQuotes: EnrichedQuickBuyQuote[];
  destTokenAmount: string | undefined;
  isQuoteLoading: boolean;
  quoteFetchError: string | null;
  isNoQuotesAvailable: boolean;
  isActiveQuoteForCurrentTokenPair: boolean;
  /**
   * True when request-only inputs the consumer cannot observe (slippage,
   * destination address, gas settings) have changed since the currently
   * displayed quotes were fetched. While true, the displayed quotes no longer
   * match the active request and must not be treated as submittable.
   */
  isQuoteRequestStale: boolean;
  /** Number of quotes returned by the most recent successful request. */
  quoteCount: number;
  /** Timestamp (ms) of the last successful quotes fetch. */
  quotesLastFetchedAt: number | null;
  /** Number of times quotes have been auto-refreshed since inputs last changed. */
  refreshCount: number;
  /** Quote refresh rate in ms (from feature flags). */
  quoteRefreshRateMs: number;
  /** Max auto-refresh attempts before showing "Get new quote" button. */
  maxRefreshCount: number;
  /** Imperatively trigger a new quotes fetch and reset the refresh counter. */
  refetchQuotes: () => void;
}

const buildQuoteRequest = ({
  sourceToken,
  destToken,
  sourceTokenAmount,
  slippage,
  walletAddress,
  destAddress,
  gasIncluded,
  gasIncluded7702,
}: {
  sourceToken: BridgeToken;
  destToken: BridgeToken;
  sourceTokenAmount: string;
  slippage: string | undefined;
  walletAddress: string;
  destAddress: string | undefined;
  gasIncluded: boolean;
  gasIncluded7702: boolean;
}): GenericQuoteRequest | null => {
  let normalizedSourceAmount: string;
  try {
    normalizedSourceAmount = calcTokenValue(
      sourceTokenAmount === '.' ? '0' : sourceTokenAmount,
      sourceToken.decimals,
    ).toFixed(0);
  } catch {
    return null;
  }

  if (normalizedSourceAmount === '0') {
    return null;
  }

  return {
    srcChainId: getDecimalChainId(sourceToken.chainId),
    srcTokenAddress: formatAddressToCaipReference(sourceToken.address),
    destChainId: getDecimalChainId(destToken.chainId),
    destTokenAddress: formatAddressToCaipReference(destToken.address),
    srcTokenAmount: normalizedSourceAmount,
    slippage: slippage ? Number(slippage) : undefined,
    walletAddress,
    destWalletAddress: destAddress ?? walletAddress,
    gasIncluded,
    gasIncluded7702,
  };
};

// Read the app-wide controller dependencies once. selectBridgeQuotesBase needs
// the background controller state so it can derive quote metadata (gas fees,
// exchange-rate-denominated amounts, …) from raw fetchQuotes results. We inject
// our locally-held quotes into this shape instead of going through Redux so the
// BridgeController background state stays untouched.
const selectQuoteMetadataDeps = (state: RootState) => ({
  bridgeController: state.engine.backgroundState.BridgeController,
  gasFeeEstimatesByChainId:
    state.engine.backgroundState.GasFeeController.gasFeeEstimatesByChainId ??
    {},
  multichainAssetsRates:
    state.engine.backgroundState.MultichainAssetsRatesController,
  tokenRates: state.engine.backgroundState.TokenRatesController,
  currencyRate: state.engine.backgroundState.CurrencyRateController,
  bridgeConfig: selectRemoteFeatureFlags(state).bridgeConfig,
});

export function useQuickBuyQuotes({
  sourceToken,
  destToken,
  sourceTokenAmount,
  analyticsContext,
  selectedQuoteRequestId,
  immediateFetchToken,
}: UseQuickBuyQuotesParams): UseQuickBuyQuotesResult {
  const slippage = useSelector(selectSlippage);
  const destAddress = useSelector(selectDestAddress);
  const walletAddress = useSelector(selectSourceWalletAddress);
  const { gasIncluded, gasIncluded7702 } = useSelector(
    selectGasIncludedQuoteParams,
  );
  const bridgeFeatureFlags = useSelector(selectBridgeFeatureFlags);
  const isStreamQuotesFlagEnabled = useSelector(
    selectSocialAIQuickBuyStreamQuotesEnabled,
  );
  const { track } = useSocialLeaderboardAnalytics();

  // Stream quotes (surfacing each provider as it replies) only when the
  // QuickBuy-specific `socialAIQuickBuyStreamQuotes` flag is on AND the client is
  // gated on for bridge SSE — otherwise fall back to the one-shot fetch.
  const shouldStream = useMemo(
    () =>
      isStreamQuotesFlagEnabled && isQuoteStreamingEnabled(bridgeFeatureFlags),
    [isStreamQuotesFlagEnabled, bridgeFeatureFlags],
  );

  const [rawQuotes, setRawQuotes] = useState<QuickBuyQuote[]>([]);
  const [isQuoteLoading, setIsQuoteLoading] = useState(false);
  // Network activity tracker, distinct from `isQuoteLoading`: a stream flips
  // `isQuoteLoading` false on its first quote (so the UI shows it immediately)
  // while the connection stays open for slower providers. The auto-refresh
  // scheduler keys off this so it never starts a new fetch mid-stream.
  const [isFetchInFlight, setIsFetchInFlight] = useState(false);
  const [quoteFetchError, setQuoteFetchError] = useState<string | null>(null);
  const [isNoQuotesAvailable, setIsNoQuotesAvailable] = useState(false);
  const [quotesLastFetchedAt, setQuotesLastFetchedAt] = useState<number | null>(
    null,
  );
  /**
   * Settle time (ms) of the most recent fetch — set when it finishes, whether it
   * succeeded or errored (but not when aborted). The auto-refresh scheduler
   * anchors on this so the next fetch fires a full `quoteRefreshRateMs` after
   * quotes settle, keeping it in sync with the countdown (which anchors on
   * `quotesLastFetchedAt`, the success settle). For a stream this is the close
   * time, so each cycle spans the stream duration plus `quoteRefreshRateMs`.
   */
  const [quotesLastSettledAt, setQuotesLastSettledAt] = useState<number | null>(
    null,
  );
  const [refreshCount, setRefreshCount] = useState(0);

  const quoteRefreshRateMs = useMemo(
    () => getQuoteRefreshRate(bridgeFeatureFlags, sourceToken),
    [bridgeFeatureFlags, sourceToken],
  );
  const maxRefreshCount = bridgeFeatureFlags?.maxRefreshCount ?? 5;

  const abortControllerRef = useRef<AbortController | null>(null);
  // Tracks request timing so the received-event can report latency.
  const requestStartedAtRef = useRef<number | null>(null);

  // Signature of the request-only inputs (slippage, destination address, gas
  // settings) that the consumer of this hook cannot observe. Used to detect when
  // the displayed quotes were fetched for a different request than the current
  // one so the CTA is not left enabled with a stale quote.
  const requestParamsKey = useMemo(
    () =>
      JSON.stringify({
        slippage: slippage ?? null,
        destAddress: destAddress ?? null,
        gasIncluded,
        gasIncluded7702,
      }),
    [slippage, destAddress, gasIncluded, gasIncluded7702],
  );
  // The request-params signature the most recently settled quotes were fetched
  // for. Null until the first fetch settles (or after quotes are reset).
  const settledRequestParamsKeyRef = useRef<string | null>(null);

  const resetQuotesIdle = useCallback(() => {
    setRawQuotes([]);
    setIsQuoteLoading(false);
    setIsFetchInFlight(false);
    setIsNoQuotesAvailable(false);
    setQuoteFetchError(null);
    setQuotesLastFetchedAt(null);
    setQuotesLastSettledAt(null);
    setRefreshCount(0);
    settledRequestParamsKeyRef.current = null;
  }, []);

  const fetchQuotes = useCallback(async () => {
    abortControllerRef.current?.abort();

    if (
      !sourceToken ||
      !destToken ||
      !walletAddress ||
      !sourceTokenAmount ||
      sourceToken.decimals === undefined
    ) {
      resetQuotesIdle();
      return;
    }

    const params = buildQuoteRequest({
      sourceToken,
      destToken,
      sourceTokenAmount,
      slippage,
      walletAddress,
      destAddress: destAddress ?? undefined,
      gasIncluded,
      gasIncluded7702,
    });

    if (!params) {
      resetQuotesIdle();
      return;
    }

    // Snapshot of the request-only inputs this fetch is for, recorded as settled
    // once the result (or error) lands so later input changes register as stale.
    const fetchedRequestParamsKey = JSON.stringify({
      slippage: slippage ?? null,
      destAddress: destAddress ?? null,
      gasIncluded,
      gasIncluded7702,
    });

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsQuoteLoading(true);
    setIsFetchInFlight(true);
    setQuoteFetchError(null);

    const requestedAt = Date.now();
    requestStartedAtRef.current = requestedAt;

    const featureId = getQuickBuyFeatureId(analyticsContext?.source);

    // Shared by REQUESTED + RECEIVED. Null when analytics context is incomplete
    // — both events guard on this single value instead of duplicating the check.
    const quotesBaseProps =
      analyticsContext?.traderAddress && analyticsContext?.caip19
        ? {
            ...buildQuickBuySharedAnalyticsProperties({
              source: analyticsContext.source,
              originalEntryPoint: analyticsContext.originalEntryPoint,
            }),
            [QuickBuyEventProperties.TRADER_ADDRESS]:
              analyticsContext.traderAddress,
            [QuickBuyEventProperties.CAIP19]: analyticsContext.caip19,
            [QuickBuyEventProperties.AMOUNT_USD]:
              analyticsContext.amountUsd ?? 0,
            [QuickBuyEventProperties.PAY_WITH_TOKEN]: sourceToken.symbol,
          }
        : null;

    if (quotesBaseProps) {
      track(
        MetaMetricsEvents.SOCIAL_QUICK_BUY_QUOTES_REQUESTED,
        quotesBaseProps,
      );
    }

    const fireReceived = (quoteCount: number) => {
      if (quotesBaseProps) {
        track(MetaMetricsEvents.SOCIAL_QUICK_BUY_QUOTES_RECEIVED, {
          ...quotesBaseProps,
          [QuickBuyEventProperties.QUOTE_COUNT]: quoteCount,
          [QuickBuyEventProperties.LATENCY_MS]: Date.now() - requestedAt,
        });
      }
    };

    try {
      if (shouldStream) {
        // Surface each provider's quote as it streams in. Previous quotes stay
        // visible until the first quote of this stream arrives (which replaces
        // them), so a refresh never flashes an empty list.
        const accumulated: QuickBuyQuote[] = [];
        let hasReceivedQuote = false;

        await streamQuickBuyQuotes(params, featureId, controller.signal, {
          onQuote: (quote) => {
            if (controller.signal.aborted) {
              return;
            }
            const existingIndex = accumulated.findIndex(
              (q) => q.quote.requestId === quote.quote.requestId,
            );
            if (existingIndex >= 0) {
              accumulated[existingIndex] = quote;
            } else {
              accumulated.push(quote);
            }
            // First quote of the stream: stop blocking the UI and drop the
            // previous stream's quotes by swapping in the fresh accumulator.
            if (!hasReceivedQuote) {
              hasReceivedQuote = true;
              setIsQuoteLoading(false);
            }
            setRawQuotes([...accumulated]);
          },
        });

        if (controller.signal.aborted) {
          return;
        }

        settledRequestParamsKeyRef.current = fetchedRequestParamsKey;
        // An empty stream means no provider quoted: clear any previous quotes
        // we were still showing.
        if (accumulated.length === 0) {
          setRawQuotes([]);
        }
        const settledAt = Date.now();
        setIsNoQuotesAvailable(accumulated.length === 0);
        setIsQuoteLoading(false);
        setIsFetchInFlight(false);
        setQuotesLastFetchedAt(settledAt);
        setQuotesLastSettledAt(settledAt);
        setRefreshCount((prev) => prev + 1);
        fireReceived(accumulated.length);
      } else {
        const result = await Engine.context.BridgeController.fetchQuotes(
          params,
          featureId,
          controller.signal,
        );

        if (controller.signal.aborted) {
          return;
        }

        settledRequestParamsKeyRef.current = fetchedRequestParamsKey;
        setRawQuotes(result);
        const settledAt = Date.now();
        setIsNoQuotesAvailable(result.length === 0);
        setIsQuoteLoading(false);
        setIsFetchInFlight(false);
        setQuotesLastFetchedAt(settledAt);
        setQuotesLastSettledAt(settledAt);
        setRefreshCount((prev) => prev + 1);
        fireReceived(result.length);
      }
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }

      const message = error instanceof Error ? error.message : String(error);
      Logger.error(
        error instanceof Error ? error : new Error(message),
        buildSocialLoggerErrorOptions({
          surface: 'quick_buy',
          operation: 'fetch_quotes',
          extraMessage: 'Error fetching QuickBuy quotes',
          source: 'useQuickBuyQuotes',
          error,
          extraTags: {
            sourceChainId: sourceToken?.chainId ?? 'unknown',
            destChainId: destToken?.chainId ?? 'unknown',
          },
        }),
      );
      settledRequestParamsKeyRef.current = fetchedRequestParamsKey;
      setQuoteFetchError(message);
      setRawQuotes([]);
      setIsNoQuotesAvailable(false);
      setIsQuoteLoading(false);
      setIsFetchInFlight(false);
      // Record the settle so the auto-refresh loop still re-arms after a
      // failure, but leave `quotesLastFetchedAt` untouched — there are no fresh
      // quotes for the countdown to anchor on.
      setQuotesLastSettledAt(Date.now());
      fireReceived(0);
    }
  }, [
    sourceToken,
    destToken,
    sourceTokenAmount,
    slippage,
    walletAddress,
    destAddress,
    gasIncluded,
    gasIncluded7702,
    shouldStream,
    resetQuotesIdle,
    analyticsContext,
    track,
  ]);

  const debouncedFetchQuotes = useMemo(
    () => debounce(fetchQuotes, QUICK_BUY_QUOTE_DEBOUNCE_MS),
    [fetchQuotes],
  );

  useEffect(() => {
    debouncedFetchQuotes();
    return () => {
      debouncedFetchQuotes.cancel();
    };
  }, [debouncedFetchQuotes]);

  // Committed-value paths (e.g. slider release) bump `immediateFetchToken`.
  // The reactive effect above has already scheduled the debounced fetch for the
  // new amount in this same commit; cancelling it and invoking `fetchQuotes`
  // directly fetches immediately with the current value, skipping the typing
  // debounce. The initial render is a no-op (token unchanged from its initial).
  const prevImmediateFetchTokenRef = useRef(immediateFetchToken);
  useEffect(() => {
    if (prevImmediateFetchTokenRef.current === immediateFetchToken) {
      return;
    }
    prevImmediateFetchTokenRef.current = immediateFetchToken;
    debouncedFetchQuotes.cancel();
    fetchQuotes();
  }, [immediateFetchToken, debouncedFetchQuotes, fetchQuotes]);

  // Auto-refresh quotes on a fixed interval indefinitely.
  // `refreshCount` starts at 0 and increments on each successful fetch, so
  // after the initial fetch (count=1) this effect schedules the next one.
  // Anchored on `quotesLastSettledAt` (the fetch/stream close), not the attempt
  // start, so the next fetch fires a full `quoteRefreshRateMs` after quotes
  // settle — matching the countdown, which anchors on the same settle. For a
  // stream this means each cycle spans the stream duration plus the refresh
  // rate. Guarded on `isFetchInFlight` (not `isQuoteLoading`) so a streaming
  // fetch — which clears `isQuoteLoading` on its first quote while still open —
  // is never interrupted by a refresh mid-stream. Refresh is never paused: a
  // stream terminates on its own (the server sends `complete`), so there is
  // nothing to hold off for.
  useEffect(() => {
    if (!quotesLastSettledAt || refreshCount === 0 || isFetchInFlight) {
      return;
    }

    const elapsed = Date.now() - quotesLastSettledAt;
    const delay = Math.max(0, quoteRefreshRateMs - elapsed);

    const timer = setTimeout(() => {
      fetchQuotes();
    }, delay);

    return () => clearTimeout(timer);
  }, [
    quotesLastSettledAt,
    refreshCount,
    quoteRefreshRateMs,
    isFetchInFlight,
    fetchQuotes,
  ]);

  /** Reset the refresh counter and re-fetch immediately (for "Get new quote" CTA). */
  const refetchQuotes = useCallback(() => {
    setRefreshCount(0);
    fetchQuotes();
  }, [fetchQuotes]);

  useEffect(
    () => () => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    },
    [],
  );

  const metadataDeps = useSelector(selectQuoteMetadataDeps, shallowEqual);

  const enrichedResult = useMemo(() => {
    // BridgeController.fetchQuotes called directly (not via internal polling)
    // does not update state.quoteRequest. The selector uses quoteRequest to look
    // up exchange rates for fee valueInCurrency computation, so we inject it
    // from the current source/dest tokens.
    const quoteRequestPatch =
      sourceToken && destToken
        ? {
            srcChainId: getDecimalChainId(sourceToken.chainId),
            srcTokenAddress: formatAddressToCaipReference(sourceToken.address),
            destChainId: getDecimalChainId(destToken.chainId),
            destTokenAddress: formatAddressToCaipReference(destToken.address),
          }
        : {};

    const existingQuoteRequest = metadataDeps.bridgeController.quoteRequest;
    const quoteRequestBase = Array.isArray(existingQuoteRequest)
      ? (existingQuoteRequest[0] ?? {})
      : (existingQuoteRequest ?? {});

    const controllerFields: BridgeAppState = {
      ...metadataDeps.bridgeController,
      quotes: rawQuotes,
      // selectBridgeQuotes destructures quoteRequest as an array at runtime.
      quoteRequest: [{ ...quoteRequestBase, ...quoteRequestPatch }],
      gasFeeEstimatesByChainId: metadataDeps.gasFeeEstimatesByChainId,
      ...metadataDeps.multichainAssetsRates,
      ...metadataDeps.tokenRates,
      ...metadataDeps.currencyRate,
      participateInMetaMetrics: analytics.isEnabled(),
      remoteFeatureFlags: {
        bridgeConfig: metadataDeps.bridgeConfig,
      },
    };

    return selectBridgeQuotesBase(controllerFields, {
      sortOrder: SortOrder.COST_ASC,
      selectedQuote: null,
    });
  }, [rawQuotes, metadataDeps, sourceToken, destToken]);

  const sortedQuotes = useMemo(
    () => enrichedResult.sortedQuotes ?? [],
    [enrichedResult.sortedQuotes],
  );

  // When the user has manually selected a provider, use that quote; otherwise
  // fall back to the recommended (lowest-cost) quote.
  const activeQuote = useMemo(() => {
    if (selectedQuoteRequestId) {
      return (
        sortedQuotes.find(
          (q) => q.quote.requestId === selectedQuoteRequestId,
        ) ??
        enrichedResult.recommendedQuote ??
        undefined
      );
    }
    return enrichedResult.recommendedQuote ?? undefined;
  }, [selectedQuoteRequestId, sortedQuotes, enrichedResult.recommendedQuote]);

  const isActiveQuoteForCurrentTokenPair = useMemo(() => {
    if (!activeQuote || !sourceToken || !destToken) {
      return false;
    }

    const { srcAsset, destAsset } = activeQuote.quote;

    const quoteSourceAddress = isNonEvmChainId(sourceToken.chainId)
      ? (srcAsset.assetId ?? srcAsset.address)
      : srcAsset.address;
    const quoteDestAddress = isNonEvmChainId(destToken.chainId)
      ? (destAsset.assetId ?? destAsset.address)
      : destAsset.address;

    return (
      areAddressesEqual(quoteSourceAddress, sourceToken.address) &&
      areAddressesEqual(quoteDestAddress, destToken.address)
    );
  }, [activeQuote, sourceToken, destToken]);

  const destTokenAmount =
    activeQuote && destToken && isActiveQuoteForCurrentTokenPair
      ? fromTokenMinimalUnit(
          activeQuote.quote.destTokenAmount,
          destToken.decimals,
        )
      : undefined;

  // The displayed quotes were fetched for a settled request; if the current
  // request-only inputs no longer match it, the quotes are stale. Before the
  // first settle (ref null) there is nothing displayed to be stale against.
  const isQuoteRequestStale =
    settledRequestParamsKeyRef.current !== null &&
    settledRequestParamsKeyRef.current !== requestParamsKey;

  return {
    activeQuote,
    sortedQuotes,
    destTokenAmount,
    isQuoteLoading,
    quoteFetchError,
    isNoQuotesAvailable,
    isActiveQuoteForCurrentTokenPair,
    isQuoteRequestStale,
    quoteCount: sortedQuotes.length,
    quotesLastFetchedAt,
    refreshCount,
    quoteRefreshRateMs,
    maxRefreshCount,
    refetchQuotes,
  };
}
