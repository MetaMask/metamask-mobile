import {
  getInternalOrderCode,
  type RampsOrder,
} from '@metamask/ramps-controller';
import ReduxService from '../../../redux';
import {
  clearTerminalOrderAnalyticsEntries,
  markTerminalOrderAnalyticsEmittedEntry,
} from '../../../redux/slices/terminalOrderAnalytics';

/**
 * Terminal-order analytics dedup registry (TRAM-3691).
 *
 * The ramps metrics subscriber (`handleOrderStatusChangedForMetrics`) is
 * triggered ONLY by `RampsController:orderStatusChanged`, which the controller
 * publishes only when polling observes a status *transition*. A callback-fetched
 * order that is ALREADY terminal on first observation (e.g. a UB2 buy that
 * `getOrderFromCallback` returns as `Completed`) is added via `addOrder` and,
 * being terminal, is never polled - so no transition is ever published and the
 * terminal analytics event (`RAMPS_TRANSACTION_COMPLETED` / `_FAILED`) is lost.
 *
 * The fix emits that event directly from the callback site
 * (`emitTerminalOrderAnalyticsFromCallback`). This module is the dedup guard so
 * the direct emit can never double-count against the polling path. The metrics
 * handler is the single emit + dedup authority: it records every terminal emit
 * here via `markTerminalOrderAnalyticsEmitted` and skips a terminal emit when
 * `hasEmittedTerminalOrderAnalytics` is already true. This closes the race in
 * both directions (poll-then-callback and callback-then-poll).
 *
 * Keyed by `getInternalOrderCode(order)` - the SAME canonical identity the
 * controller uses to store/merge orders (and that `getOrder` heals
 * `providerOrderId` to). The polling path receives a healed order and the
 * callback path receives the raw fetched order, but both carry the same `id`,
 * so `getInternalOrderCode` yields an identical key for the same order. Keying
 * off the raw `providerOrderId` would NOT be stable across those two paths.
 *
 * The key is persisted in the `terminalOrderAnalytics` redux slice so app
 * relaunches and repeated callback returns do not turn the same order settlement
 * into multiple Mixpanel events. The local Set is retained as an immediate
 * same-tick guard in case Redux persistence is temporarily unavailable.
 */
const emittedTerminalOrders = new Set<string>();

/**
 * Records that the terminal analytics event for an order has been emitted.
 *
 * @param order - The order whose terminal event was just emitted.
 */
export function markTerminalOrderAnalyticsEmitted(order: RampsOrder): void {
  const orderCode = getInternalOrderCode(order);
  emittedTerminalOrders.add(orderCode);
  ReduxService.store.dispatch(
    markTerminalOrderAnalyticsEmittedEntry(orderCode),
  );
}

/**
 * Returns whether the terminal analytics event for an order was already
 * emitted (in-memory this process, or persisted across app relaunches).
 *
 * @param order - The order to check.
 * @returns True when a terminal event was already emitted for the order.
 */
export function hasEmittedTerminalOrderAnalytics(order: RampsOrder): boolean {
  const orderCode = getInternalOrderCode(order);
  return (
    emittedTerminalOrders.has(orderCode) ||
    Boolean(ReduxService.store.getState().terminalOrderAnalytics[orderCode])
  );
}

/**
 * Test-only helper. Clears the registry between tests so entries do not leak
 * from one test into another.
 */
export function __resetTerminalOrderAnalyticsRegistryForTests(): void {
  emittedTerminalOrders.clear();
  ReduxService.store.dispatch(clearTerminalOrderAnalyticsEntries());
}
