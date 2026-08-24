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
 * 2. Backend-ranked default provider (autoSelected: true)
 *
 * @param completedOrders - Completed orders from any source (legacy + controller)
 * @param availableProviders - Available providers from RampsController
 * @param backendDefaultProviderId - Default provider ID from backend ranking
 * @returns The preferred provider with its selection source, or null if no providers are available.
 */
export function determinePreferredProvider(
  completedOrders: CompletedOrderInfo[],
  availableProviders: Provider[],
  backendDefaultProviderId?: string,
): PreferredProviderResult | null {
  if (availableProviders.length === 0) {
    return null;
  }

  if (completedOrders.length > 0) {
    const [mostRecent] = [...completedOrders].sort(
      (a, b) => b.completedAt - a.completedAt,
    );

    const foundProvider = availableProviders.find((provider) => {
      const completedProviderId = mostRecent.providerId.toLowerCase();
      return (
        provider.id?.toLowerCase() === completedProviderId ||
        provider.name?.toLowerCase() === completedProviderId ||
        (completedProviderId === 'transak' &&
          (provider.id?.toLowerCase().includes('transak') ||
            provider.name?.toLowerCase().includes('transak')))
      );
    });

    if (foundProvider) {
      return { provider: foundProvider, autoSelected: false };
    }
  }

  const backendDefaultProvider =
    availableProviders.find(
      (provider) =>
        provider.id.toLowerCase() === backendDefaultProviderId?.toLowerCase(),
    ) ?? availableProviders[0];

  return { provider: backendDefaultProvider, autoSelected: true };
}
