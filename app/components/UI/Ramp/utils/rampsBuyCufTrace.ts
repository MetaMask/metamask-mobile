import {
  trace,
  endTrace,
  getTraceContext,
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

function clearStaleParentState(): void {
  if (parentTimeoutId) {
    clearTimeout(parentTimeoutId);
    parentTimeoutId = null;
  }
  parentOpId = null;
  parentSpan = undefined;
}

function resolveParentContext(): TraceContext {
  if (
    !parentOpId ||
    getTraceContext({
      name: TraceName.RampBuyToOrderDetails,
      id: parentOpId,
    }) === undefined
  ) {
    if (parentOpId) {
      clearStaleParentState();
    }
    return undefined;
  }
  return parentSpan;
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

function withStartSpanAttributes(
  startTags: Record<string, TraceValue>,
  data?: Record<string, TraceValue>,
): Record<string, TraceValue> {
  return {
    ...startTags,
    ...data,
  };
}

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

export function startRampsBuyCufTrace({
  surface = RAMPS_BUY_CUF_SURFACE.UNKNOWN,
  tags,
  startTime,
  data,
}: StartRampsBuyCufTraceOptions = {}): string {
  if (resolveParentContext() && parentOpId) {
    return parentOpId;
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
    forceTransaction: true,
    data: withStartSpanAttributes(startTags, data),
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
  id?: string;
  data?: Record<string, TraceValue>;
  timestamp?: number;
}

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
  clearStaleParentState();
  endTrace({
    name: TraceName.RampBuyToOrderDetails,
    id: targetId,
    data,
    timestamp,
  });
}

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

export function getRampsBuyCufParentContext(): TraceContext {
  return parentSpan;
}

export function hasActiveRampsBuyCufTrace(): boolean {
  return parentOpId !== null;
}

export interface StartRampsBuyCufChildTraceOptions {
  name: TraceName;
  tags?: Record<string, TraceValue>;
  startTime?: number;
  data?: Record<string, TraceValue>;
}

export function startRampsBuyCufChildTrace({
  name,
  tags,
  startTime,
  data,
}: StartRampsBuyCufChildTraceOptions): string | null {
  const parentContext = resolveParentContext();
  if (!parentContext || !parentOpId) {
    return null;
  }

  const opId = nextCufOpId(name);
  const startTags = buildRampsBuyCufStartTags(tags);
  pendingChildMeta.set(opId, { [CUF_META.NAME]: name });
  trace({
    name,
    id: opId,
    op: TraceOperation.RampOperation,
    parentContext,
    startTime,
    data: withStartSpanAttributes(startTags, data),
    tags: startTags,
  });
  return opId;
}

export interface StartRampsBuyQuoteFetchTraceOptions {
  tags?: Record<string, TraceValue>;
  startTime?: number;
  data?: Record<string, TraceValue>;
}

export function buildRampsBuyQuoteFetchStartTags(
  providers?: string[],
): Record<string, TraceValue> | undefined {
  if (providers?.length !== 1) {
    return undefined;
  }

  return { [RAMPS_BUY_CUF_TAG.PROVIDER]: providers[0] };
}

export interface BuildRampsBuyQuoteFetchCufCompletionParams {
  isQueryError: boolean;
  response?: {
    success?: {
      provider?: string;
      quote?: unknown;
    }[];
  } | null;
  requestedProviders?: string[];
}

/**
 * Provider errors arrive in a successful HTTP response, so query status alone
 * cannot distinguish a usable quote from a provider-level miss.
 */
export function buildRampsBuyQuoteFetchCufCompletion({
  isQueryError,
  response,
  requestedProviders,
}: BuildRampsBuyQuoteFetchCufCompletionParams): Record<string, TraceValue> {
  const singleProvider =
    requestedProviders?.length === 1 ? requestedProviders[0] : undefined;
  const providerData: Record<string, TraceValue> = singleProvider
    ? { [RAMPS_BUY_CUF_TAG.PROVIDER]: singleProvider }
    : {};

  if (isQueryError) {
    return {
      [RAMPS_BUY_CUF_TAG.SUCCESS]: false,
      [RAMPS_BUY_CUF_TAG.REASON]: RAMPS_BUY_CUF_END_REASON.ERROR,
      ...providerData,
    };
  }

  const successQuotes = response?.success ?? [];
  const usableQuotes = singleProvider
    ? successQuotes.filter(({ provider }) => provider === singleProvider)
    : successQuotes;

  if (usableQuotes.length === 0) {
    return {
      [RAMPS_BUY_CUF_TAG.SUCCESS]: false,
      [RAMPS_BUY_CUF_TAG.REASON]: RAMPS_BUY_CUF_END_REASON.NO_QUOTE,
      ...providerData,
    };
  }

  const isCustomAction =
    (usableQuotes[0].quote as { isCustomAction?: boolean } | undefined)
      ?.isCustomAction === true;

  return {
    [RAMPS_BUY_CUF_TAG.SUCCESS]: true,
    ...providerData,
    ...(isCustomAction
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
  const startTags = buildRampsBuyCufStartTags(tags);
  const parentContext = resolveParentContext();
  pendingChildMeta.set(opId, { [CUF_META.NAME]: TraceName.RampBuyQuoteFetch });
  trace({
    name: TraceName.RampBuyQuoteFetch,
    id: opId,
    op: TraceOperation.RampOperation,
    parentContext,
    forceTransaction: !parentContext,
    startTime,
    data: withStartSpanAttributes(startTags, data),
    tags: startTags,
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

export function resetRampsBuyCufTraceForTests(): void {
  clearStaleParentState();
  pendingChildMeta.clear();
  cufOpCounter = 0;
}
