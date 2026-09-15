import { AppState, type AppStateStatus } from 'react-native';
import {
  trace,
  endTrace,
  getPerformanceTimestamp,
  getTraceContext,
  setTraceMeasurement,
  TraceName,
  TraceOperation,
  type TraceContext,
  type TraceValue,
} from '../../../../util/trace';
import {
  RAMPS_BUY_CUF_FEATURE,
  RAMPS_BUY_CUF_TAG,
  RAMPS_BUY_CUF_SURFACE,
  RAMPS_BUY_CUF_END_REASON,
  RAMPS_BUY_CUF_FOREGROUND_ACTIVE_MS,
  RAMPS_BUY_CUF_TIMEOUT_MS,
  RAMPS_BUY_CUF_TRACE_MAX_LIFETIME_MS,
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
let appStateSubscription: ReturnType<typeof AppState.addEventListener> | null =
  null;
let currentAppState: AppStateStatus = AppState.currentState;
let foregroundSegmentStartedAt: number | null = null;
let foregroundActiveMs = 0;
let backgroundCount = 0;
let resumeCount = 0;
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
  appStateSubscription?.remove();
  appStateSubscription = null;
  currentAppState = AppState.currentState;
  foregroundSegmentStartedAt = null;
  foregroundActiveMs = 0;
  backgroundCount = 0;
  resumeCount = 0;
  parentOpId = null;
  parentSpan = undefined;
}

function pauseForegroundSegment(now = getPerformanceTimestamp()): void {
  if (foregroundSegmentStartedAt === null) {
    return;
  }
  foregroundActiveMs += Math.max(0, now - foregroundSegmentStartedAt);
  foregroundSegmentStartedAt = null;
}

function startForegroundSegment(now = getPerformanceTimestamp()): void {
  if (foregroundSegmentStartedAt === null) {
    foregroundSegmentStartedAt = now;
  }
}

function handleAppStateChange(nextState: AppStateStatus): void {
  const wasActive = currentAppState === 'active';
  const isActive = nextState === 'active';

  if (wasActive && !isActive) {
    pauseForegroundSegment();
    backgroundCount += 1;
    endOpenRampsBuyCufChildrenByName(TraceName.RampBuyQuoteFetch, {
      [RAMPS_BUY_CUF_TAG.SUCCESS]: false,
      [RAMPS_BUY_CUF_TAG.REASON]: RAMPS_BUY_CUF_END_REASON.APP_BACKGROUNDED,
    });
  } else if (!wasActive && isActive) {
    resumeCount += 1;
    startForegroundSegment();
  }
  currentAppState = nextState;
}

function startLifecycleAccounting(startTime?: number): void {
  currentAppState = AppState.currentState;
  if (currentAppState === 'active') {
    startForegroundSegment(startTime);
  }
  appStateSubscription = AppState.addEventListener(
    'change',
    handleAppStateChange,
  );
}

/** True if Buy E2E parent is still open (incl. consent-buffered starts). */
function hasLiveParent(): boolean {
  if (!parentOpId) {
    return false;
  }

  if (parentSpan === undefined) {
    return true;
  }

  if (
    getTraceContext({
      name: TraceName.RampBuyToOrderDetails,
      id: parentOpId,
    }) === undefined
  ) {
    clearStaleParentState();
    return false;
  }

  return true;
}

function resolveParentContext(): TraceContext {
  if (!hasLiveParent()) {
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
  if (hasLiveParent() && parentOpId) {
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
    maxLifetimeMs: RAMPS_BUY_CUF_TRACE_MAX_LIFETIME_MS,
    data: withStartSpanAttributes(startTags, data),
    tags: startTags,
  });
  startLifecycleAccounting(startTime);

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

  pauseForegroundSegment(timestamp);
  const measuredForegroundMs = Math.round(foregroundActiveMs);
  const lifecycleData = {
    [RAMPS_BUY_CUF_FOREGROUND_ACTIVE_MS]: measuredForegroundMs,
    [RAMPS_BUY_CUF_TAG.BACKGROUND_COUNT]: backgroundCount,
    [RAMPS_BUY_CUF_TAG.RESUME_COUNT]: resumeCount,
    [RAMPS_BUY_CUF_TAG.LIFECYCLE_CONTEXT]:
      backgroundCount > 0 ? 'background_resumed' : 'foreground_only',
  };
  setTraceMeasurement(
    { name: TraceName.RampBuyToOrderDetails, id: targetId },
    RAMPS_BUY_CUF_FOREGROUND_ACTIVE_MS,
    measuredForegroundMs,
    'millisecond',
  );
  abandonOpenChildTraces(RAMPS_BUY_CUF_END_REASON.ABANDONED);
  clearStaleParentState();
  endTrace({
    name: TraceName.RampBuyToOrderDetails,
    id: targetId,
    data: { ...data, ...lifecycleData },
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

/** Start Buy Quote Fetch CUF. Nests under E2E parent when active. */
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

/** End Buy Quote Fetch CUF by op id. */
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
