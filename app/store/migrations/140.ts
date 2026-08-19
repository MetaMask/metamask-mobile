import { captureException } from '@sentry/react-native';
import { hasProperty, isObject } from '@metamask/utils';
import { ensureValidState } from './util';

export const migrationVersion = 140;

/**
 * Sentinel identifiers that the now-removed Navigation Dev Panel used when it
 * seeded mock orders/transactions directly into persisted controller state.
 * These were only reachable in dev/exp/flask builds (MM_ENABLE_SETTINGS_PAGE_DEV_OPTIONS),
 * but any affected device persisted them, so we scrub them here.
 */
const DEV_PANEL_FIAT_ORDER_IDS = new Set([
  'dev-panel-aggregator-order',
  'dev-panel-deposit-order',
  'dev-panel-sell-order',
]);
const DEV_PANEL_RAMPS_ORDER_ID = 'dev-panel-ramps-order';
const DEV_PANEL_BRIDGE_TX_ID = 'dev-panel-bridge-tx';

/**
 * Removes Navigation Dev Panel seeded fiat orders from `state.fiatOrders.orders`.
 *
 * @param state - The persisted root state.
 */
function cleanupFiatOrders(state: Record<string, unknown>): void {
  if (
    !hasProperty(state, 'fiatOrders') ||
    !isObject(state.fiatOrders) ||
    !Array.isArray(state.fiatOrders.orders)
  ) {
    return;
  }

  state.fiatOrders.orders = state.fiatOrders.orders.filter(
    (order: unknown) =>
      !(
        isObject(order) &&
        typeof order.id === 'string' &&
        DEV_PANEL_FIAT_ORDER_IDS.has(order.id)
      ),
  );
}

/**
 * Removes the Navigation Dev Panel seeded order from RampsController state.
 *
 * @param backgroundState - The engine background state.
 */
function cleanupRampsOrders(backgroundState: Record<string, unknown>): void {
  if (
    !hasProperty(backgroundState, 'RampsController') ||
    !isObject(backgroundState.RampsController) ||
    !Array.isArray(backgroundState.RampsController.orders)
  ) {
    return;
  }

  backgroundState.RampsController.orders =
    backgroundState.RampsController.orders.filter(
      (order: unknown) =>
        !(
          isObject(order) && order.providerOrderId === DEV_PANEL_RAMPS_ORDER_ID
        ),
    );
}

/**
 * Removes the Navigation Dev Panel seeded bridge transaction from both
 * BridgeStatusController history and TransactionController transactions.
 *
 * @param backgroundState - The engine background state.
 */
function cleanupBridgeTransaction(
  backgroundState: Record<string, unknown>,
): void {
  if (
    hasProperty(backgroundState, 'BridgeStatusController') &&
    isObject(backgroundState.BridgeStatusController) &&
    isObject(backgroundState.BridgeStatusController.txHistory) &&
    hasProperty(
      backgroundState.BridgeStatusController.txHistory,
      DEV_PANEL_BRIDGE_TX_ID,
    )
  ) {
    delete backgroundState.BridgeStatusController.txHistory[
      DEV_PANEL_BRIDGE_TX_ID
    ];
  }

  if (
    hasProperty(backgroundState, 'TransactionController') &&
    isObject(backgroundState.TransactionController) &&
    Array.isArray(backgroundState.TransactionController.transactions)
  ) {
    backgroundState.TransactionController.transactions =
      backgroundState.TransactionController.transactions.filter(
        (tx: unknown) => !(isObject(tx) && tx.id === DEV_PANEL_BRIDGE_TX_ID),
      );
  }
}

/**
 * Migration 140: Remove orders/transactions seeded by the removed Navigation
 * Dev Panel.
 *
 * The dev panel persisted mock data into live controller state (RampsController
 * orders, fiat orders, and a bridge transaction). Now that the panel is removed,
 * scrub those sentinel artifacts so they no longer surface in activity, bias
 * provider selection, or trigger provider lookups.
 *
 * Affects internal/non-production builds only: the dev panel was reachable
 * solely when MM_ENABLE_SETTINGS_PAGE_DEV_OPTIONS === 'true' (dev/exp/flask
 * builds), so production users never had this data. For everyone else this
 * migration is a no-op (no orders match the dev-panel sentinel IDs).
 */
export default function migrate(state: unknown): unknown {
  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  try {
    cleanupFiatOrders(state as unknown as Record<string, unknown>);

    const { backgroundState } = state.engine;
    if (isObject(backgroundState)) {
      cleanupRampsOrders(backgroundState);
      cleanupBridgeTransaction(backgroundState);
    }
  } catch (error) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Failed to remove Navigation Dev Panel seeded data: ${String(
          error,
        )}`,
      ),
    );
  }

  return state;
}
