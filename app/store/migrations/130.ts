import { captureException } from '@sentry/react-native';
import { hasProperty, isObject } from '@metamask/utils';
import { ensureValidState } from './util';

/**
 * Migration 130: Align fiat `order.id` with embedded deposit `order.data.id`
 *
 * Background:
 * - Some persisted deposit (`'DEPOSIT'` provider) orders stored a short `providerOrderId` in `order.id` while `order.data.id` held the canonical deposit order identifier (SDK / deep-link path form).
 * - The client now uses `depositOrder.id` as the single source of truth when building `FiatOrder` objects, so top-level `id` must match `data.id` for lookups and navigation (e.g. `getOrderById`, Order Processing).
 *
 * Changes:
 * - For deposit provider orders that include `data` with a defined string `data.id` that differs from `order.id`, set `order.id` to `data.id`.
 * - Orders without `data`, without a string `data.id`, or where ids already match, are left unchanged. Non-deposit fiat orders are not modified.
 */
export default function migrate(state: unknown): unknown {
  const migrationVersion = 130;

  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  try {
    if (
      !hasProperty(state, 'fiatOrders') ||
      !isObject(state.fiatOrders) ||
      !hasProperty(state.fiatOrders, 'orders') ||
      !Array.isArray(state.fiatOrders.orders)
    ) {
      return state;
    }

    const fiatOrders = state.fiatOrders;
    const orders = fiatOrders.orders;

    const migratedOrders = (orders as unknown[]).map((order: unknown) => {
      if (!isObject(order)) {
        return order;
      }

      // Persisted value for deposit orders; do not import FIAT_ORDER_PROVIDERS (migration must stay stable).
      if (order.provider !== 'DEPOSIT') {
        return order;
      }

      if (!hasProperty(order, 'data') || !isObject(order.data)) {
        return order;
      }

      const data = order.data as Record<string, unknown>;

      if (
        !hasProperty(data, 'id') ||
        data.id === undefined ||
        data.id === null
      ) {
        return order;
      }

      const dataId = data.id;
      if (typeof dataId !== 'string') {
        return order;
      }

      const currentId = hasProperty(order, 'id') ? order.id : undefined;
      if (currentId === dataId) {
        return order;
      }

      return {
        ...order,
        id: dataId,
      };
    });

    return {
      ...state,
      fiatOrders: {
        ...fiatOrders,
        orders: migratedOrders,
      },
    };
  } catch (error) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Failed to align deposit fiat order ids with data.id: ${String(
          error,
        )}`,
      ),
    );
    return state;
  }
}
