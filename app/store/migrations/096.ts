import { captureException } from '@sentry/react-native';
import { ensureValidState } from './util';
import { hasProperty, isObject } from '@metamask/utils';
import { isArray } from 'lodash';

interface Order {
  provider: string;
  network?: string;
  cryptocurrency?: unknown;
}

function fixCondition(order: Order): boolean {
  if (
    order.provider === 'DEPOSIT' &&
    (order.network == null || isObject(order.cryptocurrency))
  ) {
    return true;
  }
  return false;
}

/**
 * Migration: Fix deposit orders data with invalid type of values by forcing refresh
 */
const migration = async (state: unknown): Promise<unknown> => {
  const migrationVersion = 99;

  // Ensure the state is valid for migration
  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  try {
    if (!hasProperty(state, 'fiatOrders')) {
      throw new Error('Missing fiatOrders property');
    }

    if (!isObject(state.fiatOrders)) {
      throw new Error(
        `Invalid fiatOrders property type: ${typeof state.fiatOrders}`,
      );
    }

    if (!isArray(state.fiatOrders.orders)) {
      throw new Error(
        `Invalid fiatOrders.orders property type: ${typeof state.fiatOrders
          .orders}`,
      );
    }

    const updatedOrders = state.fiatOrders.orders.map((order: Order) => {
      if (isObject(order) && fixCondition(order)) {
        const cryptocurrency = isObject(order.cryptocurrency)
          ? order.cryptocurrency?.symbol
          : undefined;

        const network = isObject(order.cryptocurrency)
          ? order.cryptocurrency?.chainId
          : undefined;
        return {
          ...order,
          cryptocurrency: cryptocurrency ?? '...',
          network:
            typeof order.network === 'string' ? order.network : network ?? '',
          forceUpdate: true,
        };
      }
      return order;
    });

    state.fiatOrders.orders = updatedOrders;
    return state;
  } catch (error) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Fix deposit orders data with invalid type of values by forcing refresh failed with error: ${error}`,
      ),
    );
    return state;
  }
};

export default migration;
