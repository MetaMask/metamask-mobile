import {
  completedOrdersFromFiatOrders,
  completedOrdersFromRampsOrders,
} from './determinePreferredProvider';
import type { FiatOrder } from '../../../../reducers/fiatOrders/types';
import { type RampsOrder, RampsOrderStatus } from '@metamask/ramps-controller';
import {
  FIAT_ORDER_PROVIDERS,
  FIAT_ORDER_STATES,
} from '../../../../constants/on-ramp';
import { Order } from '@consensys/on-ramp-sdk';

const makeFiatOrder = (
  overrides: Partial<FiatOrder> & { provider: string },
): FiatOrder => ({
  id: 'order-1',
  createdAt: 1000,
  amount: '100',
  currency: 'USD',
  cryptocurrency: 'ETH',
  state: FIAT_ORDER_STATES.COMPLETED,
  account: '0x123',
  network: '1',
  orderType: 'BUY',
  excludeFromPurchases: false,
  data: {} as Order,
  ...overrides,
});

const makeRampsOrder = (overrides: Partial<RampsOrder> = {}): RampsOrder =>
  ({
    providerOrderId: 'v2-order-1',
    status: RampsOrderStatus.Completed,
    createdAt: 1000,
    provider: { id: 'provider-1', name: 'Provider One' },
    orderType: 'BUY',
    walletAddress: '0x123',
    fiatAmount: 100,
    cryptoAmount: 0.05,
    ...overrides,
  }) as RampsOrder;

describe('completedOrdersFromFiatOrders', () => {
  it('extracts provider ID from aggregator orders', () => {
    const orders = [
      makeFiatOrder({
        provider: FIAT_ORDER_PROVIDERS.AGGREGATOR,
        data: { provider: { id: 'provider-1' } } as Order,
      }),
    ];

    const result = completedOrdersFromFiatOrders(orders);

    expect(result).toEqual([{ providerId: 'provider-1', completedAt: 1000 }]);
  });

  it('maps DEPOSIT orders to TRANSAK', () => {
    const orders = [makeFiatOrder({ provider: FIAT_ORDER_PROVIDERS.DEPOSIT })];

    const result = completedOrdersFromFiatOrders(orders);

    expect(result).toEqual([{ providerId: 'TRANSAK', completedAt: 1000 }]);
  });

  it('maps TRANSAK orders to TRANSAK', () => {
    const orders = [makeFiatOrder({ provider: FIAT_ORDER_PROVIDERS.TRANSAK })];

    const result = completedOrdersFromFiatOrders(orders);

    expect(result).toEqual([{ providerId: 'TRANSAK', completedAt: 1000 }]);
  });

  it('uses provider string directly for other order types', () => {
    const orders = [makeFiatOrder({ provider: FIAT_ORDER_PROVIDERS.MOONPAY })];

    const result = completedOrdersFromFiatOrders(orders);

    expect(result).toEqual([{ providerId: 'MOONPAY', completedAt: 1000 }]);
  });

  it('skips non-completed orders', () => {
    const orders = [
      makeFiatOrder({
        provider: FIAT_ORDER_PROVIDERS.AGGREGATOR,
        state: FIAT_ORDER_STATES.PENDING,
        data: { provider: { id: 'provider-1' } } as Order,
      }),
    ];

    const result = completedOrdersFromFiatOrders(orders);

    expect(result).toEqual([]);
  });
});

describe('completedOrdersFromRampsOrders', () => {
  it('extracts provider ID from completed controller orders', () => {
    const orders = [makeRampsOrder()];

    const result = completedOrdersFromRampsOrders(orders);

    expect(result).toEqual([{ providerId: 'provider-1', completedAt: 1000 }]);
  });

  it('skips non-completed controller orders', () => {
    const orders = [makeRampsOrder({ status: RampsOrderStatus.Pending })];

    const result = completedOrdersFromRampsOrders(orders);

    expect(result).toEqual([]);
  });

  it('skips orders with no provider', () => {
    const orders = [makeRampsOrder({ provider: undefined })];

    const result = completedOrdersFromRampsOrders(orders);

    expect(result).toEqual([]);
  });
});
