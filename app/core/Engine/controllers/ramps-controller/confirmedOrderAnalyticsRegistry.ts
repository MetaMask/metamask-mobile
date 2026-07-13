import {
  getInternalOrderCode,
  type RampsOrder,
} from '@metamask/ramps-controller';

/**
 * Confirmed-order analytics dedup registry (TRAM-3738).
 *
 * `emitOrderConfirmedAnalyticsFromCallback` runs on UI callback paths (UB2
 * `OrderDetails`, headless `Checkout`) where a retry can re-run the same
 * callback after an error (e.g. headless `onOrderCreated` throws after Confirmed
 * already fired). Unlike terminal orders, non-terminal callback orders are not
 * polled for a status transition that would gate a second emit, so this module
 * is the dedup guard for `RAMPS_TRANSACTION_CONFIRMED`.
 *
 * Keyed by `getInternalOrderCode(order)` — the same canonical identity used by
 * `terminalOrderAnalyticsRegistry` so callback and polling paths agree on order
 * identity even when `providerOrderId` differs.
 *
 * In-memory, same-session only (mirrors `terminalOrderAnalyticsRegistry`). A
 * process relaunch clears it; that is acceptable because a callback re-fetch
 * after relaunch is a first observation in that session and SHOULD emit.
 */
const emittedConfirmedOrders = new Set<string>();

/**
 * Records that the confirmed analytics event for an order has been emitted.
 *
 * @param order - The order whose confirmed event was just emitted.
 */
export function markConfirmedOrderAnalyticsEmitted(order: RampsOrder): void {
  emittedConfirmedOrders.add(getInternalOrderCode(order));
}

/**
 * Returns whether the confirmed analytics event for an order was already
 * emitted this session.
 *
 * @param order - The order to check.
 * @returns True when a confirmed event was already emitted for the order.
 */
export function hasEmittedConfirmedOrderAnalytics(order: RampsOrder): boolean {
  return emittedConfirmedOrders.has(getInternalOrderCode(order));
}

/**
 * Test-only helper. Clears the registry between tests so entries do not leak
 * from one test into another.
 */
export function __resetConfirmedOrderAnalyticsRegistryForTests(): void {
  emittedConfirmedOrders.clear();
}
