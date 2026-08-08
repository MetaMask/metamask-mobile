import {
  trace,
  endTrace,
  TraceName,
  type TraceValue,
} from '../../../../util/trace';
import {
  RAMPS_QUOTE_FETCH_END_REASON,
  RAMPS_QUOTE_FETCH_FEATURE,
  RAMPS_QUOTE_FETCH_PATH,
  RAMPS_QUOTE_FETCH_RAMP_TYPE,
  RAMPS_QUOTE_FETCH_TAG,
} from '../constants/rampsQuoteFetchTags';

/**
 * Standalone Unified Buy quote-fetch tracing (TRAM-3805).
 *
 * Instruments `useRampsQuotes` with provider attribution so PayPal (and other
 * single-provider) quote outcomes are visible in Sentry → Prometheus/Grafana
 * SLOs. Does not depend on Buy E2E CUF parent spans.
 */

const pendingOpIds = new Set<string>();
let quoteFetchOpCounter = 0;

function nextOpId(): string {
  quoteFetchOpCounter += 1;
  return `${TraceName.RampQuoteLoading}#${quoteFetchOpCounter}`;
}

function buildStartTags(
  extra?: Record<string, TraceValue>,
): Record<string, TraceValue> {
  return {
    [RAMPS_QUOTE_FETCH_TAG.FEATURE]: RAMPS_QUOTE_FETCH_FEATURE,
    [RAMPS_QUOTE_FETCH_TAG.RAMP_TYPE]: RAMPS_QUOTE_FETCH_RAMP_TYPE,
    ...extra,
  };
}

/** Start tags when callers know the provider filter (BuildQuote = one id). */
export function buildRampsQuoteFetchStartTags(
  providers?: string[],
): Record<string, TraceValue> | undefined {
  if (providers?.length === 1) {
    return { [RAMPS_QUOTE_FETCH_TAG.PROVIDER]: providers[0] };
  }
  return undefined;
}

export interface BuildRampsQuoteFetchCompletionParams {
  isQueryError: boolean;
  // Structural subset of `QuotesResponse`; the index signature keeps controller
  // quote payloads (which do not declare `isCustomAction`) assignable.
  response?: {
    success?: {
      provider?: string;
      quote?: { isCustomAction?: boolean; [key: string]: unknown };
    }[];
  } | null;
  requestedProviders?: string[];
}

/**
 * End-span attributes for a quote fetch.
 *
 * Provider-filtered fetches (e.g. PayPal on BuildQuote) treat "HTTP 200 with
 * no usable quote for the requested provider" as failure — the quotes API
 * returns provider errors in `error[]` without rejecting the request.
 *
 * Custom-action quotes (PayPal / Robinhood) count as usable and are tagged
 * `path: custom_action` + `custom_action: true`.
 */
export function buildRampsQuoteFetchCompletion({
  isQueryError,
  response,
  requestedProviders,
}: BuildRampsQuoteFetchCompletionParams): Record<string, TraceValue> {
  if (isQueryError) {
    return {
      [RAMPS_QUOTE_FETCH_TAG.SUCCESS]: false,
      [RAMPS_QUOTE_FETCH_TAG.REASON]: RAMPS_QUOTE_FETCH_END_REASON.ERROR,
      ...(requestedProviders?.length === 1
        ? { [RAMPS_QUOTE_FETCH_TAG.PROVIDER]: requestedProviders[0] }
        : {}),
    };
  }

  const successQuotes = response?.success ?? [];
  const singleProvider =
    requestedProviders?.length === 1 ? requestedProviders[0] : undefined;

  const usableQuotes = singleProvider
    ? successQuotes.filter((quote) => quote.provider === singleProvider)
    : successQuotes;

  if (usableQuotes.length === 0) {
    return {
      [RAMPS_QUOTE_FETCH_TAG.SUCCESS]: false,
      [RAMPS_QUOTE_FETCH_TAG.REASON]: RAMPS_QUOTE_FETCH_END_REASON.NO_QUOTE,
      ...(singleProvider
        ? { [RAMPS_QUOTE_FETCH_TAG.PROVIDER]: singleProvider }
        : {}),
    };
  }

  const matched = usableQuotes[0];
  const isCustomActionQuote = matched.quote?.isCustomAction === true;

  return {
    [RAMPS_QUOTE_FETCH_TAG.SUCCESS]: true,
    ...(singleProvider || matched.provider
      ? {
          [RAMPS_QUOTE_FETCH_TAG.PROVIDER]:
            singleProvider ?? (matched.provider as string),
        }
      : {}),
    ...(isCustomActionQuote
      ? {
          [RAMPS_QUOTE_FETCH_TAG.PATH]: RAMPS_QUOTE_FETCH_PATH.CUSTOM_ACTION,
          [RAMPS_QUOTE_FETCH_TAG.CUSTOM_ACTION]: true,
        }
      : { [RAMPS_QUOTE_FETCH_TAG.CUSTOM_ACTION]: false }),
  };
}

export interface StartRampsQuoteFetchTraceOptions {
  tags?: Record<string, TraceValue>;
}

/**
 * Start a Unified Buy quote-fetch span. A newer fetch supersedes any still-open
 * one started by these helpers (unique op ids; Aggregator uses the default id).
 */
export function startRampsQuoteFetchTrace({
  tags,
}: StartRampsQuoteFetchTraceOptions = {}): string {
  endOpenRampsQuoteFetchTraces({
    [RAMPS_QUOTE_FETCH_TAG.SUCCESS]: false,
    [RAMPS_QUOTE_FETCH_TAG.REASON]: RAMPS_QUOTE_FETCH_END_REASON.SUPERSEDED,
  });

  const opId = nextOpId();
  pendingOpIds.add(opId);
  trace({
    name: TraceName.RampQuoteLoading,
    id: opId,
    tags: buildStartTags(tags),
  });
  return opId;
}

export interface EndRampsQuoteFetchTraceOptions {
  id: string;
  data?: Record<string, TraceValue>;
}

/** End a quote-fetch span by op id. Idempotent. */
export function endRampsQuoteFetchTrace({
  id,
  data,
}: EndRampsQuoteFetchTraceOptions): void {
  if (!pendingOpIds.has(id)) {
    return;
  }
  pendingOpIds.delete(id);
  endTrace({
    name: TraceName.RampQuoteLoading,
    id,
    data,
  });
}

function endOpenRampsQuoteFetchTraces(
  data?: Record<string, TraceValue>,
): number {
  let ended = 0;
  for (const opId of Array.from(pendingOpIds)) {
    endRampsQuoteFetchTrace({ id: opId, data });
    ended += 1;
  }
  return ended;
}

/** Test-only: drop module state between tests. */
export function resetRampsQuoteFetchTraceForTests(): void {
  pendingOpIds.clear();
  quoteFetchOpCounter = 0;
}
