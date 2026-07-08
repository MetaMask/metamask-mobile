import {
  PERPS_CONSTANTS,
  PERFORMANCE_CONFIG,
} from '@metamask/perps-controller';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import {
  trace,
  endTrace,
  TraceName,
  TraceOperation,
  type TraceValue,
} from '../../../../util/trace';
import { PERPS_CUF_TAG, PERPS_CUF_BOUNDARY } from '../constants/perpsCufTags';
import { getPerpsLifecycleContext } from './perpsLifecycleContext';

/**
 * Helpers for the Perps user-perceived CUF spans. These measure from the user
 * gesture to render-complete with live data, so start and end can live in
 * different surfaces; keying by a deterministic id (the trace name) lets the
 * ending surface close the span the starting surface opened. A pending
 * registry makes ends idempotent: the first surface to observe completion
 * (e.g. the position stream) wins, later fallbacks no-op.
 */

/** Internal metadata keys shared between the starting and ending surfaces. */
const CUF_META = {
  SYMBOL: 'symbol',
  TOAST_AT: 'toastAt',
} as const;

/** Open CUF spans: name -> metadata handed from starter to ender. */
const pendingCufMeta = new Map<string, Record<string, TraceValue>>();

/** Start tags shared by all CUF spans: feature + lifecycle_context, plus caller variants. */
export function buildPerpsCufStartTags(
  extra?: Record<string, TraceValue>,
): Record<string, TraceValue> {
  return {
    [PERPS_CUF_TAG.FEATURE]: PERPS_CONSTANTS.FeatureName,
    [PERPS_CUF_TAG.LIFECYCLE_CONTEXT]: getPerpsLifecycleContext(),
    ...extra,
  };
}

export interface StartPerpsCufTraceOptions {
  name: TraceName;
  id?: string;
  op?: TraceOperation;
  /** Flow variant tags merged onto the shared start tags. */
  tags?: Record<string, TraceValue>;
  startTime?: number;
  data?: Record<string, TraceValue>;
}

export interface EndPerpsCufTraceOptions {
  name: TraceName;
  id?: string;
  data?: Record<string, TraceValue>;
  timestamp?: number;
}

/** Start a CUF span at the user gesture. */
export function startPerpsCufTrace({
  name,
  id = name,
  op = TraceOperation.PerpsOperation,
  tags,
  startTime,
  data,
}: StartPerpsCufTraceOptions): void {
  const startTags = buildPerpsCufStartTags(tags);
  pendingCufMeta.set(name, {});
  DevLogger.log(
    `${PERFORMANCE_CONFIG.LoggingMarkers.SentryPerformance} PerpsCUF: ${name} started ${JSON.stringify(startTags)}`,
  );
  trace({ name, id, op, startTime, data, tags: startTags });
}

/** Attach metadata (e.g. order symbol, toast timestamp) to an open CUF span. */
export function setPerpsCufMeta(
  name: TraceName,
  meta: Record<string, TraceValue>,
): void {
  const existing = pendingCufMeta.get(name);
  if (existing) {
    pendingCufMeta.set(name, { ...existing, ...meta });
  }
}

/**
 * End a CUF span once the flow has rendered. Idempotent: no-ops unless the
 * span is still pending, so a fallback end after a stream end is harmless.
 */
export function endPerpsCufTrace({
  name,
  id = name,
  data,
  timestamp,
}: EndPerpsCufTraceOptions): void {
  if (!pendingCufMeta.delete(name)) {
    return;
  }
  DevLogger.log(
    `${PERFORMANCE_CONFIG.LoggingMarkers.SentryPerformance} PerpsCUF: ${name} completed ${JSON.stringify(data ?? {})}`,
  );
  endTrace({ name, id, data, timestamp });
}

/** Register the order symbol the place-order CUF span is waiting on. */
export function setPerpsPlaceOrderCufSymbol(symbol: string): void {
  setPerpsCufMeta(TraceName.PerpsPlaceOrderToPositionRendered, {
    [CUF_META.SYMBOL]: symbol,
  });
}

/** Stamp the toast moment so the stream end can compute the toast<->position delta. */
export function setPerpsPlaceOrderCufToastShown(): void {
  setPerpsCufMeta(TraceName.PerpsPlaceOrderToPositionRendered, {
    [CUF_META.TOAST_AT]: Date.now(),
  });
}

/**
 * Schedule a fallback end; a no-op if another surface (e.g. the position
 * stream) closes the span first. Used when a poll misses the position so the
 * span stays open for the stream instead of closing at the poll boundary.
 */
export function endPerpsCufTraceAfter(
  options: EndPerpsCufTraceOptions,
  delayMs: number,
): void {
  setTimeout(() => endPerpsCufTrace(options), delayMs);
}

/**
 * Stream-side end for the place-order CUF: called by the position stream when
 * fresh positions are delivered to subscribers (the moment the new position
 * renders). Ends the span only if one is pending and its symbol just arrived.
 */
export function endPerpsPlaceOrderCufOnPositions(
  positions: readonly { symbol: string }[] | null,
): void {
  const meta = pendingCufMeta.get(TraceName.PerpsPlaceOrderToPositionRendered);
  if (!meta || !positions) {
    return;
  }
  const symbol = meta[CUF_META.SYMBOL];
  if (
    typeof symbol !== 'string' ||
    !positions.some((p) => p.symbol === symbol)
  ) {
    return;
  }
  const toastAt = meta[CUF_META.TOAST_AT];
  endPerpsCufTrace({
    name: TraceName.PerpsPlaceOrderToPositionRendered,
    data: {
      [PERPS_CUF_TAG.SUCCESS]: true,
      [PERPS_CUF_TAG.BOUNDARY]: PERPS_CUF_BOUNDARY.STREAM,
      [PERPS_CUF_TAG.TOAST_TO_POSITION_MS]:
        typeof toastAt === 'number' ? Date.now() - toastAt : -1,
    },
  });
}
