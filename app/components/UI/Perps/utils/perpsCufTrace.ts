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
import {
  PERPS_CUF_TAG,
  PERPS_CUF_BOUNDARY,
  PERPS_CUF_END_REASON,
} from '../constants/perpsCufTags';
import { getPerpsLifecycleContext } from './perpsLifecycleContext';

/**
 * Helpers for the Perps user-perceived CUF spans. These measure from the user
 * gesture to render-complete with live data, so start and end can live in
 * different surfaces. Each start mints a unique operation id; the pending
 * registry is keyed by that id (not the trace name) so overlapping operations
 * of the same flow — e.g. two cancels in flight — each get their own span and
 * are matched/ended independently. The ending surface (usually the stream)
 * finds the right pending op by matching its watched criteria.
 */

/** Internal metadata keys carried from the starting to the ending surface. */
const CUF_META = {
  NAME: 'name',
  SYMBOL: 'symbol',
  WATCH: 'watch',
  ORDER_ID: 'orderId',
  SNAPSHOT: 'snapshot',
} as const;

/** What a pending confirmation span is watching for in the stream. */
const PERPS_CUF_WATCH = {
  POSITION_CHANGED: 'position_changed',
  ORDER_ABSENT: 'order_absent',
  ORDER_PRESENT: 'order_present',
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

/** Open CUF spans: unique op id -> metadata handed from starter to ender. */
const pendingCufMeta = new Map<string, Record<string, TraceValue>>();
let cufOpCounter = 0;

/** Mint a unique, greppable op id for a span start. */
function nextCufOpId(name: TraceName): string {
  cufOpCounter += 1;
  return `${name}#${cufOpCounter}`;
}

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
  op?: TraceOperation;
  /** Flow variant tags merged onto the shared start tags. */
  tags?: Record<string, TraceValue>;
  startTime?: number;
  data?: Record<string, TraceValue>;
}

/** Start a CUF span at the user gesture. Returns the op id used to end it. */
export function startPerpsCufTrace({
  name,
  op = TraceOperation.PerpsOperation,
  tags,
  startTime,
  data,
}: StartPerpsCufTraceOptions): string {
  const opId = nextCufOpId(name);
  const startTags = buildPerpsCufStartTags(tags);
  pendingCufMeta.set(opId, { [CUF_META.NAME]: name });
  DevLogger?.log?.(
    `${PERFORMANCE_CONFIG.LoggingMarkers.SentryPerformance} PerpsCUF: ${name} started ${JSON.stringify(startTags)}`,
  );
  trace({ name, id: opId, op, startTime, data, tags: startTags });
  return opId;
}

/** Attach metadata (e.g. order symbol, watch criteria) to an open CUF span. */
export function setPerpsCufMeta(
  opId: string,
  meta: Record<string, TraceValue>,
): void {
  const existing = pendingCufMeta.get(opId);
  if (existing) {
    pendingCufMeta.set(opId, { ...existing, ...meta });
  }
}

export interface EndPerpsCufTraceOptions {
  id: string;
  data?: Record<string, TraceValue>;
  timestamp?: number;
}

/**
 * End a CUF span once the flow has rendered. Idempotent: no-ops unless the op
 * is still pending, so a fallback end after a stream end is harmless, and a
 * fallback for a superseded op cannot touch a newer one (distinct op ids).
 */
export function endPerpsCufTrace({
  id,
  data,
  timestamp,
}: EndPerpsCufTraceOptions): void {
  const meta = pendingCufMeta.get(id);
  if (!meta) {
    return;
  }
  pendingCufMeta.delete(id);
  const name = meta[CUF_META.NAME] as TraceName;
  DevLogger?.log?.(
    `${PERFORMANCE_CONFIG.LoggingMarkers.SentryPerformance} PerpsCUF: ${name} completed ${JSON.stringify(data ?? {})}`,
  );
  endTrace({ name, id, data, timestamp });
}

/**
 * Schedule a fallback end for a specific op; a no-op if the stream (or the
 * caller) closes that op first. Because ids are unique per operation, a
 * superseded op's fallback can never close a later op of the same flow.
 */
export function endPerpsCufTraceAfter(
  options: EndPerpsCufTraceOptions,
  delayMs: number,
): void {
  setTimeout(() => endPerpsCufTrace(options), delayMs);
}

/** First stream render matching an armed place-order confirmation. */
export interface PerpsCufPositionRendered {
  position: PerpsCufPositionLike;
  renderedAt: number;
}

let placeOrderRendered: PerpsCufPositionRendered | null = null;
let placeOrderResolver: (() => void) | null = null;
/** Op id of the place-order span currently awaiting its position render. */
let placeOrderOpId: string | null = null;

/**
 * Arm the place-order confirmation for `opId`: the stream matcher fires when a
 * position for `symbol` renders that is new or changed versus the pre-order
 * baseline, so a pre-existing position on the same market can't confirm early.
 * A newer arm supersedes any earlier place-order waiter.
 */
export function armPerpsPlaceOrderCuf(
  opId: string,
  symbol: string,
  baseline?: PerpsCufPositionLike | null,
): void {
  // A prior place-order op still pending is being superseded: end it now so it
  // can't linger in the registry as an open span (the position path has no
  // scheduled fallback — its only ends are this arm, the stream render, and the
  // waiter timeout, all of which key off the current op id).
  if (placeOrderOpId && pendingCufMeta.has(placeOrderOpId)) {
    endPerpsCufTrace({
      id: placeOrderOpId,
      data: {
        [PERPS_CUF_TAG.SUCCESS]: false,
        [PERPS_CUF_TAG.REASON]: PERPS_CUF_END_REASON.SUPERSEDED,
      },
    });
  }
  placeOrderOpId = opId;
  placeOrderRendered = null;
  placeOrderResolver = null;
  setPerpsCufMeta(opId, {
    [CUF_META.SYMBOL]: symbol,
    ...(baseline ? { [CUF_META.SNAPSHOT]: positionSnapshot(baseline) } : {}),
  });
}

/** Whether `opId` still owns the place-order confirmation state. */
export function isPerpsPlaceOrderCufCurrent(opId: string): boolean {
  return opId === placeOrderOpId;
}

/** Test-only: drop all pending spans and place-order state between tests. */
export function resetPerpsCufTraceForTests(): void {
  pendingCufMeta.clear();
  placeOrderRendered = null;
  placeOrderResolver = null;
  placeOrderOpId = null;
}

/**
 * Resolve with the armed position's first stream render, or `null` after
 * `timeoutMs`. Resolves immediately when the render already happened or when
 * `opId` has been superseded by a newer order.
 */
export function waitForPerpsPlaceOrderPositionRendered(
  timeoutMs: number,
  opId: string,
): Promise<PerpsCufPositionRendered | null> {
  if (!isPerpsPlaceOrderCufCurrent(opId) || !pendingCufMeta.has(opId)) {
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
      resolve(isPerpsPlaceOrderCufCurrent(opId) ? placeOrderRendered : null);
    };
    const timer = setTimeout(wake, timeoutMs);
    cancelTimer = () => clearTimeout(timer);
    placeOrderResolver = wake;
  });
}

/**
 * Stream-side matcher for the place-order CUF: records when the armed position
 * first renders (new, or changed versus the pre-order baseline) and wakes the
 * waiter. `flushThrottled` is invoked before the render timestamp is stamped so
 * throttled subscribers actually receive the data at the measured instant.
 * Returns true when it matched (so the caller can flush once for the tick).
 */
function resolvePerpsPlaceOrderCufOnPositions(
  positions: readonly PerpsCufPositionLike[],
  flushThrottled?: () => void,
): void {
  if (placeOrderRendered || !placeOrderOpId) {
    return;
  }
  const meta = pendingCufMeta.get(placeOrderOpId);
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
  flushThrottled?.();
  placeOrderRendered = { position: current, renderedAt: Date.now() };
  placeOrderResolver?.();
}

/** Watch for the given position to change (or vanish) before ending `opId`. */
export function watchPerpsCufPositionChanged(
  opId: string,
  position: PerpsCufPositionLike,
): void {
  setPerpsCufMeta(opId, {
    [CUF_META.WATCH]: PERPS_CUF_WATCH.POSITION_CHANGED,
    [CUF_META.SYMBOL]: position.symbol,
    [CUF_META.SNAPSHOT]: positionSnapshot(position),
  });
}

/** Watch for the given order to disappear before ending `opId`. */
export function watchPerpsCufOrderAbsent(opId: string, orderId: string): void {
  setPerpsCufMeta(opId, {
    [CUF_META.WATCH]: PERPS_CUF_WATCH.ORDER_ABSENT,
    [CUF_META.ORDER_ID]: orderId,
  });
}

/** Watch for the given order to appear (render) in the stream before ending `opId`. */
export function watchPerpsCufOrderPresent(opId: string, orderId: string): void {
  setPerpsCufMeta(opId, {
    [CUF_META.WATCH]: PERPS_CUF_WATCH.ORDER_PRESENT,
    [CUF_META.ORDER_ID]: orderId,
  });
}

/** End `opId` on the next positions delivery, whatever it contains. */
export function watchPerpsCufAnyPositions(opId: string): void {
  setPerpsCufMeta(opId, {
    [CUF_META.WATCH]: PERPS_CUF_WATCH.ANY_POSITIONS,
  });
}

const STREAM_END_DATA = {
  [PERPS_CUF_TAG.SUCCESS]: true,
  [PERPS_CUF_TAG.BOUNDARY]: PERPS_CUF_BOUNDARY.STREAM,
} as const;

/** Op ids of every pending span with the given trace name. */
function pendingOpIdsForName(name: TraceName): string[] {
  const ids: string[] = [];
  for (const [opId, meta] of pendingCufMeta) {
    if (meta[CUF_META.NAME] === name) {
      ids.push(opId);
    }
  }
  return ids;
}

/**
 * Positions just rendered to stream subscribers: close every pending CUF span
 * whose watched condition is now visible (new position, changed/absent
 * position, or any fresh delivery after a reconnect). `flushThrottled` is
 * called once, before any span is ended, so throttled subscribers receive the
 * update at the measured render instant instead of up to a throttle interval
 * later.
 */
export function handlePerpsCufPositionsDelivered(
  positions: readonly PerpsCufPositionLike[] | null,
  flushThrottled?: () => void,
): void {
  if (!positions) {
    return;
  }

  // Collect matches first so a single flush covers the whole tick.
  const positionChangedNames = [
    TraceName.PerpsClosePositionToConfirmation,
    TraceName.PerpsUpdateTPSLToConfirmation,
  ];
  const toEnd: string[] = [];
  for (const name of positionChangedNames) {
    for (const opId of pendingOpIdsForName(name)) {
      const meta = pendingCufMeta.get(opId);
      if (meta?.[CUF_META.WATCH] !== PERPS_CUF_WATCH.POSITION_CHANGED) {
        continue;
      }
      const symbol = meta[CUF_META.SYMBOL];
      if (typeof symbol !== 'string') {
        continue;
      }
      const current = positions.find((p) => p.symbol === symbol);
      const currentSnapshot = current ? positionSnapshot(current) : undefined;
      if (currentSnapshot !== meta[CUF_META.SNAPSHOT]) {
        toEnd.push(opId);
      }
    }
  }
  for (const opId of pendingOpIdsForName(
    TraceName.PerpsWebSocketReconnectToFreshData,
  )) {
    if (
      pendingCufMeta.get(opId)?.[CUF_META.WATCH] ===
      PERPS_CUF_WATCH.ANY_POSITIONS
    ) {
      toEnd.push(opId);
    }
  }

  const placeWillMatch =
    !placeOrderRendered &&
    !!placeOrderOpId &&
    (() => {
      const meta = pendingCufMeta.get(placeOrderOpId);
      if (!meta) {
        return false;
      }
      const symbol = meta[CUF_META.SYMBOL];
      if (typeof symbol !== 'string') {
        return false;
      }
      const current = positions.find((p) => p.symbol === symbol);
      if (!current) {
        return false;
      }
      const baseline = meta[CUF_META.SNAPSHOT];
      return (
        typeof baseline !== 'string' || positionSnapshot(current) !== baseline
      );
    })();

  // Flush once if anything is about to be confirmed, so the measured render
  // instant reflects real subscriber delivery (not the throttle enqueue).
  if (flushThrottled && (toEnd.length > 0 || placeWillMatch)) {
    flushThrottled();
  }

  resolvePerpsPlaceOrderCufOnPositions(positions);
  for (const opId of toEnd) {
    endPerpsCufTrace({ id: opId, data: { ...STREAM_END_DATA } });
  }
}

/**
 * Orders just rendered to stream subscribers: close pending cancel spans once
 * their order is absent, and pending limit-order-render spans once their order
 * is present. Flushes throttled subscribers once before ending, as above.
 */
export function handlePerpsCufOrdersDelivered(
  orders: readonly { orderId: string }[] | null,
  flushThrottled?: () => void,
): void {
  if (!orders) {
    return;
  }

  const toEnd: string[] = [];
  for (const opId of pendingOpIdsForName(
    TraceName.PerpsCancelOrderToConfirmation,
  )) {
    const meta = pendingCufMeta.get(opId);
    const orderId = meta?.[CUF_META.ORDER_ID];
    if (
      meta?.[CUF_META.WATCH] === PERPS_CUF_WATCH.ORDER_ABSENT &&
      typeof orderId === 'string' &&
      orders.every((o) => o.orderId !== orderId)
    ) {
      toEnd.push(opId);
    }
  }
  for (const opId of pendingOpIdsForName(
    TraceName.PerpsPlaceLimitOrderToOrderRendered,
  )) {
    const meta = pendingCufMeta.get(opId);
    const orderId = meta?.[CUF_META.ORDER_ID];
    if (
      meta?.[CUF_META.WATCH] === PERPS_CUF_WATCH.ORDER_PRESENT &&
      typeof orderId === 'string' &&
      orders.some((o) => o.orderId === orderId)
    ) {
      toEnd.push(opId);
    }
  }

  if (flushThrottled && toEnd.length > 0) {
    flushThrottled();
  }
  for (const opId of toEnd) {
    endPerpsCufTrace({ id: opId, data: { ...STREAM_END_DATA } });
  }
}
