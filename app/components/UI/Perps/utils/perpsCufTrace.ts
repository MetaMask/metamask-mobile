import {
  PERPS_CONSTANTS,
  PERFORMANCE_CONFIG,
} from '@metamask/perps-controller';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
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
  WATCH: 'watch',
  ORDER_ID: 'orderId',
  SNAPSHOT: 'snapshot',
  INSTANCE: 'instance',
} as const;

/** Monotonic id per span start so delayed fallbacks can't end a successor. */
let cufInstanceCounter = 0;

/** What a pending confirmation span is watching for in the stream. */
const PERPS_CUF_WATCH = {
  POSITION_CHANGED: 'position_changed',
  ORDER_ABSENT: 'order_absent',
  ANY_POSITIONS: 'any_positions',
} as const;

/** Minimal position shape the confirmation matchers need. */
export interface PerpsCufPositionLike {
  symbol: string;
  size: string;
  takeProfitPrice?: string;
  stopLossPrice?: string;
}

function positionSnapshot(position: PerpsCufPositionLike): string {
  return `${position.size}|${position.takeProfitPrice ?? ''}|${position.stopLossPrice ?? ''}`;
}

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
  cufInstanceCounter += 1;
  pendingCufMeta.set(name, { [CUF_META.INSTANCE]: cufInstanceCounter });
  DevLogger?.log?.(
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
  DevLogger?.log?.(
    `${PERFORMANCE_CONFIG.LoggingMarkers.SentryPerformance} PerpsCUF: ${name} completed ${JSON.stringify(data ?? {})}`,
  );
  endTrace({ name, id, data, timestamp });
}

/** First stream render matching an armed place-order confirmation. */
export interface PerpsCufPositionRendered {
  position: PerpsCufPositionLike;
  renderedAt: number;
}

let placeOrderRendered: PerpsCufPositionRendered | null = null;
let placeOrderResolver: (() => void) | null = null;
/** Bumped on every arm so waiters from a superseded order go inert. */
let placeOrderGeneration = 0;

/**
 * Arm the place-order confirmation: the stream matcher fires when a position
 * for `symbol` renders that is new or changed versus the pre-order baseline,
 * so a pre-existing position on the same market can't confirm the order early.
 * Returns a generation token; waiters from earlier generations resolve null
 * and never touch the newly armed order's span.
 */
export function armPerpsPlaceOrderCuf(
  symbol: string,
  baseline?: PerpsCufPositionLike | null,
): number {
  placeOrderGeneration += 1;
  placeOrderRendered = null;
  placeOrderResolver = null;
  setPerpsCufMeta(TraceName.PerpsPlaceOrderToPositionRendered, {
    [CUF_META.SYMBOL]: symbol,
    ...(baseline ? { [CUF_META.SNAPSHOT]: positionSnapshot(baseline) } : {}),
  });
  return placeOrderGeneration;
}

/** Whether `generation` still owns the place-order confirmation state. */
export function isPerpsPlaceOrderCufCurrent(generation: number): boolean {
  return generation === placeOrderGeneration;
}

/**
 * Resolve with the armed position's first stream render, or `null` after
 * `timeoutMs`. Resolves immediately when the render already happened or when
 * `generation` has been superseded by a newer order.
 */
export function waitForPerpsPlaceOrderPositionRendered(
  timeoutMs: number,
  generation: number,
): Promise<PerpsCufPositionRendered | null> {
  if (
    !isPerpsPlaceOrderCufCurrent(generation) ||
    !pendingCufMeta.has(TraceName.PerpsPlaceOrderToPositionRendered)
  ) {
    return Promise.resolve(null);
  }
  if (placeOrderRendered) {
    return Promise.resolve(placeOrderRendered);
  }
  return new Promise((resolve) => {
    let cancelTimer = () => {
      // Replaced once the timeout is scheduled.
    };
    const wake = () => {
      cancelTimer();
      if (placeOrderResolver === wake) {
        placeOrderResolver = null;
      }
      resolve(
        isPerpsPlaceOrderCufCurrent(generation) ? placeOrderRendered : null,
      );
    };
    const timer = setTimeout(wake, timeoutMs);
    cancelTimer = () => clearTimeout(timer);
    placeOrderResolver = wake;
  });
}

/**
 * Schedule a fallback end for the CURRENTLY pending span instance; a no-op if
 * another surface (e.g. the position stream) closes it first, and inert if a
 * new span with the same name has started by the time the delay fires.
 */
export function endPerpsCufTraceAfter(
  options: EndPerpsCufTraceOptions,
  delayMs: number,
): void {
  const instance = pendingCufMeta.get(options.name)?.[CUF_META.INSTANCE];
  if (instance === undefined) {
    return;
  }
  setTimeout(() => {
    if (pendingCufMeta.get(options.name)?.[CUF_META.INSTANCE] !== instance) {
      return;
    }
    endPerpsCufTrace(options);
  }, delayMs);
}

/**
 * Stream-side matcher for the place-order CUF: records when the armed
 * position first renders (new, or changed versus the pre-order baseline) and
 * wakes the waiter. The hook owns ending the span so the confirmation toast
 * and the measured delta stay coupled to this render.
 */
function resolvePerpsPlaceOrderCufOnPositions(
  positions: readonly PerpsCufPositionLike[] | null,
): void {
  if (placeOrderRendered || !positions) {
    return;
  }
  const meta = pendingCufMeta.get(TraceName.PerpsPlaceOrderToPositionRendered);
  if (!meta) {
    return;
  }
  const symbol = meta[CUF_META.SYMBOL];
  if (typeof symbol !== 'string') {
    return;
  }
  const current = positions.find((p) => p.symbol === symbol);
  if (!current) {
    return;
  }
  const baseline = meta[CUF_META.SNAPSHOT];
  if (typeof baseline === 'string' && positionSnapshot(current) === baseline) {
    // Pre-order position unchanged: the order's fill hasn't rendered yet.
    return;
  }
  placeOrderRendered = { position: current, renderedAt: Date.now() };
  placeOrderResolver?.();
}

/** Watch for the given position to change (or vanish) before ending `name`. */
export function watchPerpsCufPositionChanged(
  name: TraceName,
  position: PerpsCufPositionLike,
): void {
  setPerpsCufMeta(name, {
    [CUF_META.WATCH]: PERPS_CUF_WATCH.POSITION_CHANGED,
    [CUF_META.SYMBOL]: position.symbol,
    [CUF_META.SNAPSHOT]: positionSnapshot(position),
  });
}

/** Watch for the given order to disappear before ending `name`. */
export function watchPerpsCufOrderAbsent(
  name: TraceName,
  orderId: string,
): void {
  setPerpsCufMeta(name, {
    [CUF_META.WATCH]: PERPS_CUF_WATCH.ORDER_ABSENT,
    [CUF_META.ORDER_ID]: orderId,
  });
}

/** End `name` on the next positions delivery, whatever it contains. */
export function watchPerpsCufAnyPositions(name: TraceName): void {
  setPerpsCufMeta(name, {
    [CUF_META.WATCH]: PERPS_CUF_WATCH.ANY_POSITIONS,
  });
}

const STREAM_END_DATA = {
  [PERPS_CUF_TAG.SUCCESS]: true,
  [PERPS_CUF_TAG.BOUNDARY]: PERPS_CUF_BOUNDARY.STREAM,
} as const;

/**
 * Positions just rendered to stream subscribers: close every pending CUF span
 * whose watched condition is now visible (new position, changed/absent
 * position, or any fresh delivery after a reconnect).
 */
export function handlePerpsCufPositionsDelivered(
  positions: readonly PerpsCufPositionLike[] | null,
): void {
  resolvePerpsPlaceOrderCufOnPositions(positions);
  if (!positions) {
    return;
  }
  for (const name of [
    TraceName.PerpsClosePositionToConfirmation,
    TraceName.PerpsUpdateTPSLToConfirmation,
  ]) {
    const meta = pendingCufMeta.get(name);
    if (meta?.[CUF_META.WATCH] !== PERPS_CUF_WATCH.POSITION_CHANGED) {
      continue;
    }
    const symbol = meta[CUF_META.SYMBOL];
    if (typeof symbol !== 'string') {
      continue;
    }
    const current = positions.find((p) => p.symbol === symbol);
    const currentSnapshot = current?.symbol
      ? positionSnapshot(current)
      : undefined;
    if (currentSnapshot !== meta[CUF_META.SNAPSHOT]) {
      endPerpsCufTrace({ name, data: { ...STREAM_END_DATA } });
    }
  }
  const reconnectMeta = pendingCufMeta.get(
    TraceName.PerpsWebSocketReconnectToFreshData,
  );
  if (reconnectMeta?.[CUF_META.WATCH] === PERPS_CUF_WATCH.ANY_POSITIONS) {
    endPerpsCufTrace({
      name: TraceName.PerpsWebSocketReconnectToFreshData,
      data: { ...STREAM_END_DATA },
    });
  }
}

/** Orders just rendered to stream subscribers: close a pending cancel span. */
export function handlePerpsCufOrdersDelivered(
  orders: readonly { orderId: string }[] | null,
): void {
  if (!orders) {
    return;
  }
  const meta = pendingCufMeta.get(TraceName.PerpsCancelOrderToConfirmation);
  if (meta?.[CUF_META.WATCH] !== PERPS_CUF_WATCH.ORDER_ABSENT) {
    return;
  }
  const orderId = meta[CUF_META.ORDER_ID];
  if (typeof orderId !== 'string') {
    return;
  }
  if (orders?.every((o) => o.orderId !== orderId)) {
    endPerpsCufTrace({
      name: TraceName.PerpsCancelOrderToConfirmation,
      data: { ...STREAM_END_DATA },
    });
  }
}
