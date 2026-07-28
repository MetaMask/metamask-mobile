import {
  trace,
  endTrace,
  TraceName,
  TraceOperation,
  type TraceContext,
  type TraceValue,
} from '../../../../util/trace';
import {
  RAMPS_BUY_CUF_FEATURE,
  RAMPS_BUY_CUF_TAG,
  RAMPS_BUY_CUF_SURFACE,
  RAMPS_BUY_CUF_PATH,
  RAMPS_BUY_CUF_END_REASON,
  RAMPS_BUY_CUF_TIMEOUT_MS,
  type RampsBuyCufSurface,
} from '../constants/rampsBuyCufTags';
import type { BuyFlowOrigin } from '../Views/BuildQuote/BuildQuote';

/**
 * Helpers for the Unified Buy user-perceived CUF spans (TRAM-3779).
 *
 * The parent span starts at Buy entry (`goToBuy` / deep link) and ends when
 * `RampsOrderDetails` has a known order. Child spans (quote / checkout /
 * native) nest under the parent via `parentContext` when a parent is active.
 *
 * Single-flight: a newer Buy entry supersedes any still-open parent.
 */

const CUF_META = {
  NAME: 'name',
} as const;

const pendingChildMeta = new Map<string, Record<string, TraceValue>>();
let parentOpId: string | null = null;
let parentSpan: TraceContext;
let parentTimeoutId: ReturnType<typeof setTimeout> | null = null;
let cufOpCounter = 0;

function nextCufOpId(name: TraceName): string {
  cufOpCounter += 1;
  return `${name}#${cufOpCounter}`;
}

export function buildRampsBuyCufStartTags(
  extra?: Record<string, TraceValue>,
): Record<string, TraceValue> {
  return {
    [RAMPS_BUY_CUF_TAG.FEATURE]: RAMPS_BUY_CUF_FEATURE,
    [RAMPS_BUY_CUF_TAG.RAMP_TYPE]: 'UNIFIED_BUY_2',
    ...extra,
  };
}

/** Map BuildQuote `buyFlowOrigin` to a CUF surface tag when callers omit surface. */
export function surfaceFromBuyFlowOrigin(
  buyFlowOrigin?: BuyFlowOrigin,
): RampsBuyCufSurface {
  if (buyFlowOrigin === 'tokenInfo') {
    return RAMPS_BUY_CUF_SURFACE.TOKEN_BUY;
  }
  if (buyFlowOrigin === 'homeTokenList') {
    return RAMPS_BUY_CUF_SURFACE.HOME_TOKEN_LIST;
  }
  return RAMPS_BUY_CUF_SURFACE.UNKNOWN;
}

export interface StartRampsBuyCufTraceOptions {
  surface?: RampsBuyCufSurface;
  tags?: Record<string, TraceValue>;
  startTime?: number;
  data?: Record<string, TraceValue>;
}

/**
 * Start the Buy E2E parent span. Supersedes any still-open parent.
 * Returns the op id used to end it (also tracked module-level for cross-surface end).
 */
export function startRampsBuyCufTrace({
  surface = RAMPS_BUY_CUF_SURFACE.UNKNOWN,
  tags,
  startTime,
  data,
}: StartRampsBuyCufTraceOptions = {}): string {
  if (parentOpId) {
    endRampsBuyCufTrace({
      data: {
        [RAMPS_BUY_CUF_TAG.SUCCESS]: false,
        [RAMPS_BUY_CUF_TAG.REASON]: RAMPS_BUY_CUF_END_REASON.SUPERSEDED,
      },
    });
  }

  const opId = nextCufOpId(TraceName.RampBuyToOrderDetails);
  const startTags = buildRampsBuyCufStartTags({
    [RAMPS_BUY_CUF_TAG.SURFACE]: surface,
    ...tags,
  });

  parentOpId = opId;
  parentSpan = trace({
    name: TraceName.RampBuyToOrderDetails,
    id: opId,
    op: TraceOperation.RampOperation,
    startTime,
    data,
    tags: startTags,
  });

  endRampsBuyCufTraceAfter(
    {
      data: {
        [RAMPS_BUY_CUF_TAG.SUCCESS]: false,
        [RAMPS_BUY_CUF_TAG.REASON]: RAMPS_BUY_CUF_END_REASON.TIMEOUT,
      },
    },
    RAMPS_BUY_CUF_TIMEOUT_MS,
  );

  return opId;
}

export interface EndRampsBuyCufTraceOptions {
  /** When omitted, ends the current single-flight parent. */
  id?: string;
  data?: Record<string, TraceValue>;
  timestamp?: number;
}

/**
 * End the Buy E2E parent span. Idempotent: no-ops unless the targeted (or
 * current) parent is still pending. Also abandons any open child spans.
 */
export function endRampsBuyCufTrace({
  id,
  data,
  timestamp,
}: EndRampsBuyCufTraceOptions = {}): void {
  const targetId = id ?? parentOpId;
  if (!targetId || targetId !== parentOpId) {
    return;
  }

  abandonOpenChildTraces(RAMPS_BUY_CUF_END_REASON.ABANDONED);

  if (parentTimeoutId) {
    clearTimeout(parentTimeoutId);
    parentTimeoutId = null;
  }
  parentOpId = null;
  parentSpan = undefined;
  endTrace({
    name: TraceName.RampBuyToOrderDetails,
    id: targetId,
    data,
    timestamp,
  });
}

/** Schedule a fallback end; no-ops if the parent already ended. */
export function endRampsBuyCufTraceAfter(
  options: EndRampsBuyCufTraceOptions,
  delayMs: number,
): void {
  if (parentTimeoutId) {
    clearTimeout(parentTimeoutId);
  }
  const scheduledFor = parentOpId;
  parentTimeoutId = setTimeout(() => {
    parentTimeoutId = null;
    if (scheduledFor && scheduledFor === parentOpId) {
      endRampsBuyCufTrace(options);
    }
  }, delayMs);
}

/** Parent span context for nesting child CUF spans. */
export function getRampsBuyCufParentContext(): TraceContext {
  return parentSpan;
}

/** Whether a Buy E2E parent span is currently open. */
export function hasActiveRampsBuyCufTrace(): boolean {
  return parentOpId !== null;
}

export interface StartRampsBuyCufChildTraceOptions {
  name: TraceName;
  tags?: Record<string, TraceValue>;
  startTime?: number;
  data?: Record<string, TraceValue>;
}

/**
 * Start a child CUF span nested under the active Buy E2E parent.
 * Returns null when no parent is active (child is skipped).
 */
export function startRampsBuyCufChildTrace({
  name,
  tags,
  startTime,
  data,
}: StartRampsBuyCufChildTraceOptions): string | null {
  if (!parentOpId) {
    return null;
  }

  const opId = nextCufOpId(name);
  pendingChildMeta.set(opId, { [CUF_META.NAME]: name });
  trace({
    name,
    id: opId,
    op: TraceOperation.RampOperation,
    parentContext: parentSpan,
    startTime,
    data,
    tags: buildRampsBuyCufStartTags(tags),
  });
  return opId;
}

export interface StartRampsBuyQuoteFetchTraceOptions {
  tags?: Record<string, TraceValue>;
  startTime?: number;
  data?: Record<string, TraceValue>;
}

/**
 * Start tags for a quote-fetch CUF when callers know the provider filter.
 * Single-provider fetches (BuildQuote / PayPal) get a filterable `provider` tag.
 */
export function buildRampsBuyQuoteFetchStartTags(
  providers?: string[],
): Record<string, TraceValue> | undefined {
  if (!providers?.length) {
    return undefined;
  }
  if (providers.length === 1) {
    return { [RAMPS_BUY_CUF_TAG.PROVIDER]: providers[0] };
  }
  return undefined;
}

export interface BuildRampsBuyQuoteFetchCufCompletionParams {
  isQueryError: boolean;
  /** Quotes API body when the HTTP/query layer succeeded. */
  response?: {
    success?: Array<{
      provider?: string;
      quote?: { isCustomAction?: boolean };
    }>;
  } | null;
  /** Provider ids passed to getQuotes (single-provider = BuildQuote). */
  requestedProviders?: string[];
}

/**
 * Build end-span attributes for Buy Quote Fetch (TRAM-3780 / TRAM-3805).
 *
 * Provider-filtered fetches (e.g. PayPal on BuildQuote) treat "HTTP 200 with
 * no usable quote for the requested provider" as failure — the quotes API
 * returns provider errors in `error[]` without rejecting the request, which
 * would otherwise look like a successful CUF to Prometheus/Grafana SLOs.
 *
 * Custom-action quotes (PayPal / Robinhood) count as usable and are tagged
 * `path: custom_action` + `custom_action: true`.
 */
export function buildRampsBuyQuoteFetchCufCompletion({
  isQueryError,
  response,
  requestedProviders,
}: BuildRampsBuyQuoteFetchCufCompletionParams): Record<string, TraceValue> {
  if (isQueryError) {
    return {
      [RAMPS_BUY_CUF_TAG.SUCCESS]: false,
      [RAMPS_BUY_CUF_TAG.REASON]: RAMPS_BUY_CUF_END_REASON.ERROR,
      ...(requestedProviders?.length === 1
        ? { [RAMPS_BUY_CUF_TAG.PROVIDER]: requestedProviders[0] }
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
      [RAMPS_BUY_CUF_TAG.SUCCESS]: false,
      [RAMPS_BUY_CUF_TAG.REASON]: RAMPS_BUY_CUF_END_REASON.NO_QUOTE,
      ...(singleProvider
        ? { [RAMPS_BUY_CUF_TAG.PROVIDER]: singleProvider }
        : {}),
    };
  }

  const matched = usableQuotes[0];
  const isCustomActionQuote = matched.quote?.isCustomAction === true;

  return {
    [RAMPS_BUY_CUF_TAG.SUCCESS]: true,
    ...(singleProvider || matched.provider
      ? {
          [RAMPS_BUY_CUF_TAG.PROVIDER]:
            singleProvider ?? (matched.provider as string),
        }
      : {}),
    ...(isCustomActionQuote
      ? {
          [RAMPS_BUY_CUF_TAG.PATH]: RAMPS_BUY_CUF_PATH.CUSTOM_ACTION,
          [RAMPS_BUY_CUF_TAG.CUSTOM_ACTION]: true,
        }
      : { [RAMPS_BUY_CUF_TAG.CUSTOM_ACTION]: false }),
  };
}

/**
 * Start the Buy Quote Fetch CUF (TRAM-3780).
 *
 * Always fires (standalone CUF). When a Buy E2E parent is open, nests under it
 * via `parentContext`. A newer quote fetch supersedes any still-open one.
 */
export function startRampsBuyQuoteFetchTrace({
  tags,
  startTime,
  data,
}: StartRampsBuyQuoteFetchTraceOptions = {}): string {
  endOpenRampsBuyCufChildrenByName(TraceName.RampBuyQuoteFetch, {
    [RAMPS_BUY_CUF_TAG.SUCCESS]: false,
    [RAMPS_BUY_CUF_TAG.REASON]: RAMPS_BUY_CUF_END_REASON.SUPERSEDED,
  });

  const opId = nextCufOpId(TraceName.RampBuyQuoteFetch);
  pendingChildMeta.set(opId, { [CUF_META.NAME]: TraceName.RampBuyQuoteFetch });
  trace({
    name: TraceName.RampBuyQuoteFetch,
    id: opId,
    op: TraceOperation.RampOperation,
    parentContext: parentSpan,
    startTime,
    data,
    tags: buildRampsBuyCufStartTags(tags),
  });
  return opId;
}

export interface EndRampsBuyQuoteFetchTraceOptions {
  id: string;
  data?: Record<string, TraceValue>;
  timestamp?: number;
}

/** End a Buy Quote Fetch CUF by op id. Idempotent. */
export function endRampsBuyQuoteFetchTrace({
  id,
  data,
  timestamp,
}: EndRampsBuyQuoteFetchTraceOptions): void {
  endRampsBuyCufChildTrace({ id, data, timestamp });
}

export interface EndRampsBuyCufChildTraceOptions {
  id: string;
  data?: Record<string, TraceValue>;
  timestamp?: number;
}

/**
 * End a child CUF span by op id. Idempotent: no-ops if already ended.
 */
export function endRampsBuyCufChildTrace({
  id,
  data,
  timestamp,
}: EndRampsBuyCufChildTraceOptions): void {
  const meta = pendingChildMeta.get(id);
  if (!meta) {
    return;
  }
  pendingChildMeta.delete(id);
  const name = meta[CUF_META.NAME] as TraceName;
  endTrace({ name, id, data, timestamp });
}

/**
 * End every open child with the given name (e.g. supersede prior quote fetch).
 * Returns the number of children ended.
 */
export function endOpenRampsBuyCufChildrenByName(
  name: TraceName,
  data?: Record<string, TraceValue>,
): number {
  let ended = 0;
  for (const [opId, meta] of Array.from(pendingChildMeta.entries())) {
    if (meta[CUF_META.NAME] === name) {
      endRampsBuyCufChildTrace({ id: opId, data });
      ended += 1;
    }
  }
  return ended;
}

function abandonOpenChildTraces(reason: string): void {
  for (const [opId] of Array.from(pendingChildMeta.entries())) {
    endRampsBuyCufChildTrace({
      id: opId,
      data: {
        [RAMPS_BUY_CUF_TAG.SUCCESS]: false,
        [RAMPS_BUY_CUF_TAG.REASON]: reason,
      },
    });
  }
}

/** Test-only: drop parent + child state between tests. */
export function resetRampsBuyCufTraceForTests(): void {
  if (parentTimeoutId) {
    clearTimeout(parentTimeoutId);
    parentTimeoutId = null;
  }
  pendingChildMeta.clear();
  parentOpId = null;
  parentSpan = undefined;
  cufOpCounter = 0;
}
