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
  // True when the positions cache was not loaded at submit, so the pre-order
  // baseline is unknown and must be captured from the first stream delivery.
  BASELINE_PENDING: 'baselinePending',
  // Confirmation flows (cancel/close/TP-SL) arm their stream watcher at the
  // gesture but must not record a stream success until the controller has
  // accepted the request — otherwise an unrelated stream change during the
  // request window would mislabel a failed request as a success. True until
  // acceptPerpsCufRequest is called.
  AWAIT_ACCEPT: 'awaitAccept',
  // Instant a gated op's watched render was first seen while still awaiting
  // acceptance; the span ends at this instant once the request is accepted.
  DEFERRED_AT: 'deferredAt',
} as const;

/** What a pending confirmation span is watching for in the stream. */
const PERPS_CUF_WATCH = {
  /** Close: position size reduced or the position vanished. */
  POSITION_CLOSED: 'position_closed',
  /** TP/SL update: the position's take-profit or stop-loss value changed. */
  TPSL_CHANGED: 'tpsl_changed',
  ORDER_ABSENT: 'order_absent',
  /** Limit place: the order rests in the orders stream OR fills into a position. */
  ORDER_PRESENT_OR_FILLED: 'order_present_or_filled',
  ANY_POSITIONS: 'any_positions',
} as const;

/** Minimal position shape the confirmation matchers need. */
export interface PerpsCufPositionLike {
  symbol: string;
  size: string;
  takeProfitPrice?: string;
  stopLossPrice?: string;
}

/** Position-size snapshot used for order-fill matchers; TP/SL-only updates do not fill. */
function positionSnapshot(position: PerpsCufPositionLike): string {
  return position.size;
}

/** TP/SL-only snapshot: a size change must not end a TP/SL confirmation. */
function tpSlSnapshot(position: PerpsCufPositionLike): string {
  return `${position.takeProfitPrice ?? ''}|${position.stopLossPrice ?? ''}`;
}

/**
 * Whether `current` (the symbol's position now, or undefined if absent) is a
 * render of an order versus `baselineSize` (the pre-order size, or undefined
 * when there was no prior position). A render is a new position (no baseline),
 * a changed position, OR a pre-existing position now absent because the order
 * reduced it fully to zero. Shared by the stream matcher and the hook's
 * synchronous fast path so the two cannot drift.
 */
export function isPerpsFillRendered(
  current: PerpsCufPositionLike | undefined,
  baselineSize: string | undefined,
): boolean {
  const baselineExisted = baselineSize !== undefined;
  if (current) {
    return !baselineExisted || positionSnapshot(current) !== baselineSize;
  }
  return baselineExisted;
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
 *
 * Note: the timer is intentionally not cancelled when the op ends early — the
 * end is idempotent, so the fallback simply no-ops. This keeps each closure
 * alive until it fires (<= the delay, typically 30s), which is negligible for
 * the low volume of user-driven confirmations.
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
 *
 * The market place-order confirmation is deliberately SINGLE-FLIGHT: it uses
 * module-level waiter/resolver state (there is one order form, guarded by
 * `isPlacing`), so a newer arm supersedes any earlier one and ends it as
 * `superseded`. This is the one intentional exception to the otherwise
 * op-id-per-operation registry — the render must be measured at the toast site
 * (the hook), which needs a single awaited handle rather than a passive watch.
 */
export function armPerpsPlaceOrderCuf(
  opId: string,
  symbol: string,
  baseline?: PerpsCufPositionLike | null,
  baselineLoaded: boolean = true,
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
  // Wake any waiter from the superseded op so its caller doesn't block until
  // the old race timer fires; it resolves null because the op id no longer owns.
  const supersededResolver = placeOrderResolver;
  placeOrderOpId = opId;
  placeOrderRendered = null;
  placeOrderResolver = null;
  supersededResolver?.();
  setPerpsCufMeta(opId, {
    [CUF_META.SYMBOL]: symbol,
    ...baselineMeta(baseline, baselineLoaded),
  });
}

/**
 * Baseline metadata for an order-render matcher. A loaded cache gives a known
 * baseline (a position's size, or absent when none). An unloaded cache leaves
 * the baseline pending so it's captured from the first stream delivery rather
 * than assumed absent — otherwise a pre-existing position in that first
 * delivery would falsely satisfy the render.
 */
function baselineMeta(
  baseline: PerpsCufPositionLike | null | undefined,
  baselineLoaded: boolean,
): Record<string, TraceValue> {
  if (!baselineLoaded) {
    return { [CUF_META.BASELINE_PENDING]: true };
  }
  return baseline ? { [CUF_META.SNAPSHOT]: positionSnapshot(baseline) } : {};
}

/** Whether `opId` still owns the place-order confirmation state. */
export function isPerpsPlaceOrderCufCurrent(opId: string): boolean {
  return opId === placeOrderOpId;
}

/**
 * End every pending CUF span as an abandoned failure and clear the single-flight
 * place-order state. Called at teardown boundaries — disconnect, account or
 * network switch — where the confirming streams are reset: without this, a
 * pending confirmation (close/cancel/TP-SL/place) from the previous session
 * could be falsely ended as a stream success by the next session's first
 * delivery, since the matchers key only on symbol/orderId/baseline.
 */
export function clearPendingPerpsCufTraces(
  reason: string = PERPS_CUF_END_REASON.DISCONNECTED,
): void {
  for (const [id, meta] of Array.from(pendingCufMeta.entries())) {
    // Preserve the reconnect-to-fresh-data span: it is armed to MEASURE a
    // reconnection and is ended by the fresh delivery, so it must survive a
    // teardown clear rather than be abandoned by it.
    if (meta[CUF_META.NAME] === TraceName.PerpsWebSocketReconnectToFreshData) {
      continue;
    }
    endPerpsCufTrace({
      id,
      data: {
        [PERPS_CUF_TAG.SUCCESS]: false,
        [PERPS_CUF_TAG.REASON]: reason,
      },
    });
  }
  const resolver = placeOrderResolver;
  placeOrderOpId = null;
  placeOrderResolver = null;
  placeOrderRendered = null;
  // Wake any place-order waiter so its caller unblocks; the op id is no longer
  // current, so it resolves null.
  resolver?.();
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
 * Whether the armed position has rendered for op `opId`: a new/changed position
 * for its symbol, OR — when a position existed pre-order — that position now
 * absent (the order reduced/flipped it to zero via the order form).
 *
 * When the baseline is pending (positions cache was unloaded at submit), the
 * first delivery is captured as the baseline and NOT counted as a render. This
 * avoids falsely confirming against a pre-existing position on the first tick.
 */
function placeOrderPositionRendered(
  opId: string,
  meta: Record<string, TraceValue>,
  positions: readonly PerpsCufPositionLike[],
): PerpsCufPositionLike | null {
  const symbol = meta[CUF_META.SYMBOL];
  if (typeof symbol !== 'string') {
    return null;
  }
  const current = positions.find((p) => p.symbol === symbol);
  if (meta[CUF_META.BASELINE_PENDING] === true) {
    setPerpsCufMeta(opId, {
      [CUF_META.BASELINE_PENDING]: false,
      ...(current ? { [CUF_META.SNAPSHOT]: positionSnapshot(current) } : {}),
    });
    return null;
  }
  const baseline = meta[CUF_META.SNAPSHOT];
  const baselineSize = typeof baseline === 'string' ? baseline : undefined;
  if (isPerpsFillRendered(current, baselineSize)) {
    // A present position renders itself; an absent one that existed before
    // renders as a synthetic zero (the order closed it).
    return current ?? { symbol, size: '0' };
  }
  return null;
}

/** Close confirmation: end `opId` when its position's size shrinks or vanishes. */
export function watchPerpsCufPositionClosed(
  opId: string,
  position: PerpsCufPositionLike,
): void {
  setPerpsCufMeta(opId, {
    [CUF_META.WATCH]: PERPS_CUF_WATCH.POSITION_CLOSED,
    [CUF_META.SYMBOL]: position.symbol,
    [CUF_META.SNAPSHOT]: position.size,
    [CUF_META.AWAIT_ACCEPT]: true,
  });
}

/** TP/SL confirmation: end `opId` when its position's TP or SL value changes. */
export function watchPerpsCufTpSlChanged(
  opId: string,
  position: PerpsCufPositionLike,
): void {
  setPerpsCufMeta(opId, {
    [CUF_META.WATCH]: PERPS_CUF_WATCH.TPSL_CHANGED,
    [CUF_META.SYMBOL]: position.symbol,
    [CUF_META.SNAPSHOT]: tpSlSnapshot(position),
    [CUF_META.AWAIT_ACCEPT]: true,
  });
}

/** Watch for the given order to disappear before ending `opId`. */
export function watchPerpsCufOrderAbsent(opId: string, orderId: string): void {
  setPerpsCufMeta(opId, {
    [CUF_META.WATCH]: PERPS_CUF_WATCH.ORDER_ABSENT,
    [CUF_META.ORDER_ID]: orderId,
    [CUF_META.AWAIT_ACCEPT]: true,
  });
}

/**
 * Limit place confirmation: end `opId` when the order renders as resting in the
 * orders stream OR fills into a position (a marketable limit never rests).
 * `positionBaseline` is the symbol's pre-order position, so a fill is detected
 * as a new/changed position rather than a pre-existing one.
 */
export function watchPerpsCufLimitRendered(
  opId: string,
  orderId: string,
  symbol: string,
  positionBaseline?: PerpsCufPositionLike | null,
  baselineLoaded: boolean = true,
): void {
  setPerpsCufMeta(opId, {
    [CUF_META.WATCH]: PERPS_CUF_WATCH.ORDER_PRESENT_OR_FILLED,
    [CUF_META.ORDER_ID]: orderId,
    [CUF_META.SYMBOL]: symbol,
    ...baselineMeta(positionBaseline, baselineLoaded),
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
 * A watched render matched for `opId`. End it now unless the op is still
 * awaiting request acceptance — in that case record the render instant and
 * defer, so acceptPerpsCufRequest can complete it as a success only once the
 * request is accepted. This prevents an unrelated stream change during the
 * request window from recording a failed cancel/close/TP-SL as a success.
 *
 * Returns true only on the FIRST deferral tick, so the caller flushes throttled
 * subscribers exactly once: DEFERRED_AT captures that instant, so later ticks in
 * the same await window need no further flush. The one flush ensures the
 * throttled subscriber receives the update at DEFERRED_AT for a truthful span.
 */
function confirmOrDefer(
  opId: string,
  meta: Record<string, TraceValue>,
  toEnd: string[],
): boolean {
  if (meta[CUF_META.AWAIT_ACCEPT] === true) {
    if (meta[CUF_META.DEFERRED_AT] === undefined) {
      setPerpsCufMeta(opId, { [CUF_META.DEFERRED_AT]: Date.now() });
      return true;
    }
    return false;
  }
  toEnd.push(opId);
  return false;
}

/**
 * Mark a confirmation op's request as accepted by the controller. If its
 * watched render was already seen while gated, end it now as a success at that
 * recorded instant; otherwise clear the gate so the next matching delivery ends
 * it. A no-op if the op already ended (e.g. request failed or the fallback
 * timed out), so a later stream success can never override a failure.
 */
export function acceptPerpsCufRequest(opId: string): void {
  const meta = pendingCufMeta.get(opId);
  if (!meta) {
    return;
  }
  const deferredAt = meta[CUF_META.DEFERRED_AT];
  if (typeof deferredAt === 'number') {
    endPerpsCufTrace({
      id: opId,
      data: { ...STREAM_END_DATA },
      timestamp: deferredAt,
    });
    return;
  }
  setPerpsCufMeta(opId, { [CUF_META.AWAIT_ACCEPT]: false });
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
  const toEnd: string[] = [];
  // A gated match that is deferred still needs the flush (see confirmOrDefer).
  let deferred = false;
  // Close: size reduced or position absent versus the pre-close size.
  for (const opId of pendingOpIdsForName(
    TraceName.PerpsClosePositionToConfirmation,
  )) {
    const meta = pendingCufMeta.get(opId);
    if (meta?.[CUF_META.WATCH] !== PERPS_CUF_WATCH.POSITION_CLOSED) {
      continue;
    }
    const symbol = meta[CUF_META.SYMBOL];
    if (typeof symbol !== 'string') {
      continue;
    }
    const current = positions.find((p) => p.symbol === symbol);
    // A close confirms on the position vanishing or its magnitude shrinking —
    // not on a size increase (an overlapping add must not confirm a close).
    // Compared by absolute value so shorts (negative size) work too.
    const baselineSize = Math.abs(
      Number.parseFloat(String(meta[CUF_META.SNAPSHOT])),
    );
    const closed =
      !current || Math.abs(Number.parseFloat(current.size)) < baselineSize;
    if (closed) {
      deferred = confirmOrDefer(opId, meta, toEnd) || deferred;
    }
  }
  // TP/SL: the position is still present and its TP or SL value changed.
  for (const opId of pendingOpIdsForName(
    TraceName.PerpsUpdateTPSLToConfirmation,
  )) {
    const meta = pendingCufMeta.get(opId);
    if (meta?.[CUF_META.WATCH] !== PERPS_CUF_WATCH.TPSL_CHANGED) {
      continue;
    }
    const symbol = meta[CUF_META.SYMBOL];
    if (typeof symbol !== 'string') {
      continue;
    }
    const current = positions.find((p) => p.symbol === symbol);
    if (current && tpSlSnapshot(current) !== meta[CUF_META.SNAPSHOT]) {
      deferred = confirmOrDefer(opId, meta, toEnd) || deferred;
    }
  }
  // Limit place: a marketable limit that filled renders as a new/changed
  // position instead of a resting order.
  for (const opId of pendingOpIdsForName(
    TraceName.PerpsPlaceLimitOrderToOrderRendered,
  )) {
    const meta = pendingCufMeta.get(opId);
    if (meta?.[CUF_META.WATCH] !== PERPS_CUF_WATCH.ORDER_PRESENT_OR_FILLED) {
      continue;
    }
    if (placeOrderPositionRendered(opId, meta, positions)) {
      toEnd.push(opId);
    }
  }
  // Reconnect: any fresh positions delivery.
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

  // Place-order render: evaluate exactly once (the matcher mutates on the
  // baseline-capture tick, so it must not be called twice per delivery).
  let placeRenderedNow: PerpsCufPositionLike | null = null;
  if (!placeOrderRendered && placeOrderOpId) {
    const meta = pendingCufMeta.get(placeOrderOpId);
    if (meta) {
      placeRenderedNow = placeOrderPositionRendered(
        placeOrderOpId,
        meta,
        positions,
      );
    }
  }

  // Flush once if anything is about to be confirmed (or deferred), so the
  // measured render instant reflects real subscriber delivery (not the throttle
  // enqueue).
  if (flushThrottled && (toEnd.length > 0 || placeRenderedNow || deferred)) {
    flushThrottled();
  }

  if (placeRenderedNow) {
    placeOrderRendered = {
      position: placeRenderedNow,
      renderedAt: Date.now(),
    };
    placeOrderResolver?.();
  }
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
  let deferred = false;
  for (const opId of pendingOpIdsForName(
    TraceName.PerpsCancelOrderToConfirmation,
  )) {
    const meta = pendingCufMeta.get(opId);
    const orderId = meta?.[CUF_META.ORDER_ID];
    if (
      meta &&
      meta[CUF_META.WATCH] === PERPS_CUF_WATCH.ORDER_ABSENT &&
      typeof orderId === 'string' &&
      orders.every((o) => o.orderId !== orderId)
    ) {
      deferred = confirmOrDefer(opId, meta, toEnd) || deferred;
    }
  }
  for (const opId of pendingOpIdsForName(
    TraceName.PerpsPlaceLimitOrderToOrderRendered,
  )) {
    const meta = pendingCufMeta.get(opId);
    const orderId = meta?.[CUF_META.ORDER_ID];
    if (
      meta?.[CUF_META.WATCH] === PERPS_CUF_WATCH.ORDER_PRESENT_OR_FILLED &&
      typeof orderId === 'string' &&
      orders.some((o) => o.orderId === orderId)
    ) {
      toEnd.push(opId);
    }
  }

  if (flushThrottled && (toEnd.length > 0 || deferred)) {
    flushThrottled();
  }
  for (const opId of toEnd) {
    endPerpsCufTrace({ id: opId, data: { ...STREAM_END_DATA } });
  }
}
