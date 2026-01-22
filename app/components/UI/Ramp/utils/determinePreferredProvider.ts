import { Order } from '@consensys/on-ramp-sdk';
import type { Provider } from '@metamask/ramps-controller';
import type { FiatOrder } from '../../../../reducers/fiatOrders/types';
import {
  FIAT_ORDER_PROVIDERS,
  FIAT_ORDER_STATES,
} from '../../../../constants/on-ramp';

/**
 * Determines the preferred provider based on user's order history and available providers.
 *
 * Logic:
 * 1. If user has completed orders, use the provider from the most recent completed order
 * 2. Find that provider in the available providers list
 * 3. If no orders or provider not found, default to Transak
 * 4. If Transak is not available, use the first provider in the list
 *
 * @param orders - Array of fiat orders
 * @param availableProviders - Array of available providers from RampsController
 * @returns The preferred provider, or null if no providers are available
 */
export function determinePreferredProvider(
  orders: FiatOrder[],
  availableProviders: Provider[],
): Provider | null {
  if (availableProviders.length === 0) {
    return null;
  }

  const completedOrders = orders.filter(
    (order) => order.state === FIAT_ORDER_STATES.COMPLETED,
  );

  if (completedOrders.length > 0) {
    const [lastCompletedOrder] = [...completedOrders].sort(
      (a, b) => b.createdAt - a.createdAt,
    );

    let providerId: string | undefined;

    if (lastCompletedOrder.provider === FIAT_ORDER_PROVIDERS.AGGREGATOR) {
      const orderData = lastCompletedOrder.data as Order;
      providerId = orderData?.provider?.id;
    } else if (
      lastCompletedOrder.provider === FIAT_ORDER_PROVIDERS.DEPOSIT ||
      lastCompletedOrder.provider === FIAT_ORDER_PROVIDERS.TRANSAK
    ) {
      providerId = 'TRANSAK';
    } else {
      providerId = lastCompletedOrder.provider;
    }

    if (providerId) {
      const foundProvider = availableProviders.find(
        (provider) =>
          provider.id?.toLowerCase() === providerId?.toLowerCase() ||
          provider.name?.toLowerCase() === providerId?.toLowerCase(),
      );

      if (foundProvider) {
        return foundProvider;
      }
    }
  }

  const transakProvider = availableProviders.find(
    (provider) =>
      provider.id?.toLowerCase().includes('transak') ||
      provider.name?.toLowerCase().includes('transak'),
  );

  if (transakProvider) {
    return transakProvider;
  }

  return availableProviders[0];
}
