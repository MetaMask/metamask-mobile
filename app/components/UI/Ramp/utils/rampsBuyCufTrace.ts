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

/** Drop module parent state when Sentry cleanup ended the span out-of-band. */
function clearStaleParentState(): void {
  if (parentTimeoutId) {
    clearTimeout(parentTimeoutId);
    parentTimeoutId = null;
  }
  parentOpId = null;
  parentSpan = undefined;
}

function isParentSpanStillActive(): boolean {
  if (!parentOpId) {
    return false;
  }
  return (
    getTraceContext({
      name: TraceName.RampBuyToOrderDetails,
      id: parentOpId,
    }) !== undefined
  );
}

function resolveParentContext(): TraceContext {
  if (!parentOpId) {
    return undefined;
  }
  if (!isParentSpanStillActive()) {
    clearStaleParentState();
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
  if (parentOpId) {
    if (isParentSpanStillActive()) {
      return parentOpId;
    }
    clearStaleParentState();
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
  if (parentTimeoutId) {
    clearTimeout(parentTimeoutId);
    parentTimeoutId = null;
  }
  pendingChildMeta.clear();
  parentOpId = null;
  parentSpan = undefined;
  cufOpCounter = 0;
}
