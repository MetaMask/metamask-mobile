import { Order } from '@consensys/on-ramp-sdk';
import {
  type Provider,
  type RampsOrder,
  RampsOrderStatus,
} from '@metamask/ramps-controller';
import type { FiatOrder } from '../../../../reducers/fiatOrders/types';
import {
  FIAT_ORDER_PROVIDERS,
  FIAT_ORDER_STATES,
} from '../../../../constants/on-ramp';

/**
 * Minimal representation of a completed order used for provider selection
 * and "previously used" logic. Both FiatOrder and RampsOrder map into this.
 */
export interface CompletedOrderInfo {
  providerId: string;
  completedAt: number;
}

export function completedOrdersFromFiatOrders(
  orders: FiatOrder[],
): CompletedOrderInfo[] {
  return orders
    .filter((order) => order.state === FIAT_ORDER_STATES.COMPLETED)
    .reduce<CompletedOrderInfo[]>((acc, order) => {
      let providerId: string | undefined;

      if (
        order.provider === FIAT_ORDER_PROVIDERS.AGGREGATOR ||
        order.provider === FIAT_ORDER_PROVIDERS.RAMPS_V2
      ) {
        const orderData =
          order.provider === FIAT_ORDER_PROVIDERS.RAMPS_V2
            ? (order.data as RampsOrder)
            : (order.data as Order);
        providerId = orderData?.provider?.id;
      } else if (
        order.provider === FIAT_ORDER_PROVIDERS.DEPOSIT ||
        order.provider === FIAT_ORDER_PROVIDERS.TRANSAK
      ) {
        providerId = 'TRANSAK';
      } else {
        providerId = order.provider;
      }

      if (providerId) {
        acc.push({ providerId, completedAt: order.createdAt });
      }
      return acc;
    }, []);
}

export function completedOrdersFromRampsOrders(
  orders: RampsOrder[],
): CompletedOrderInfo[] {
  return orders
    .filter((order) => order.status === RampsOrderStatus.Completed)
    .reduce<CompletedOrderInfo[]>((acc, order) => {
      const providerId = order.provider?.id;
      if (providerId) {
        acc.push({ providerId, completedAt: order.createdAt });
      }
      return acc;
    }, []);
}

export interface PreferredProviderResult {
  provider: Provider;
  autoSelected: boolean;
}

/**
 * Determines the preferred provider based on user's completed order history.
 *
 * Fallback order:
 * 1. Provider from most recent completed order (autoSelected: false)
 * 2. Transak (autoSelected: false)
 * 3. null — no preselection; wait for the user to pick a token, then
 * choose the first provider that supports it.
 *
 * @param completedOrders - Completed orders from any source (legacy + controller)
 * @param availableProviders - Available providers from RampsController
 * @returns The preferred provider with its selection source, or null if no
 * providers are available or no signal exists to pick one.
 */
export function determinePreferredProvider(
  completedOrders: CompletedOrderInfo[],
  availableProviders: Provider[],
): PreferredProviderResult | null {
  if (availableProviders.length === 0) {
    return null;
  }

  if (completedOrders.length > 0) {
    const [mostRecent] = [...completedOrders].sort(
      (a, b) => b.completedAt - a.completedAt,
    );

    const foundProvider = availableProviders.find(
      (provider) =>
        provider.id?.toLowerCase() === mostRecent.providerId.toLowerCase() ||
        provider.name?.toLowerCase() === mostRecent.providerId.toLowerCase(),
    );

    if (foundProvider) {
      return { provider: foundProvider, autoSelected: false };
    }
  }

  const transakProvider = availableProviders.find(
    (provider) =>
      provider.id?.toLowerCase().includes('transak') ||
      provider.name?.toLowerCase().includes('transak'),
  );

  if (transakProvider) {
    return { provider: transakProvider, autoSelected: false };
  }

  return null;
}
