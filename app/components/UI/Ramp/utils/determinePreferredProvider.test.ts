import {
  determinePreferredProvider,
  completedOrdersFromFiatOrders,
  completedOrdersFromRampsOrders,
} from './determinePreferredProvider';
import type { FiatOrder } from '../../../../reducers/fiatOrders/types';
import {
  type Provider,
  type RampsOrder,
  RampsOrderStatus,
} from '@metamask/ramps-controller';
import {
  FIAT_ORDER_PROVIDERS,
  FIAT_ORDER_STATES,
} from '../../../../constants/on-ramp';
import { Order } from '@consensys/on-ramp-sdk';

const mockProvider1: Provider = {
  id: 'provider-1',
  name: 'Provider One',
  environmentType: 'PRODUCTION',
  description: 'Test Provider 1',
  hqAddress: '123 Test St',
  links: [],
  logos: {
    light: 'https://example.com/logo1-light.png',
    dark: 'https://example.com/logo1-dark.png',
    height: 24,
    width: 79,
  },
};

const mockProvider2: Provider = {
  id: 'provider-2',
  name: 'Provider Two',
  environmentType: 'PRODUCTION',
  description: 'Test Provider 2',
  hqAddress: '456 Test St',
  links: [],
  logos: {
    light: 'https://example.com/logo2-light.png',
    dark: 'https://example.com/logo2-dark.png',
    height: 24,
    width: 79,
  },
};

const mockTransakProvider: Provider = {
  id: 'transak',
  name: 'Transak',
  environmentType: 'PRODUCTION',
  description: 'Transak Provider',
  hqAddress: '789 Test St',
  links: [],
  logos: {
    light: 'https://example.com/transak-light.png',
    dark: 'https://example.com/transak-dark.png',
    height: 24,
    width: 79,
  },
};

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

describe('determinePreferredProvider', () => {
  describe('when no providers are available', () => {
    it('returns null', () => {
      const result = determinePreferredProvider([], []);

      expect(result).toBeNull();
    });
  });

  describe('when user has completed orders', () => {
    it('returns provider from most recent completed order', () => {
      const completedOrders = [
        { providerId: 'provider-1', completedAt: 1000 },
        { providerId: 'provider-2', completedAt: 2000 },
      ];
      const providers = [mockProvider1, mockProvider2, mockTransakProvider];

      const result = determinePreferredProvider(completedOrders, providers);

      expect(result).toEqual(mockProvider2);
    });

    it('falls back to Transak if provider from order is not in available providers', () => {
      const completedOrders = [
        { providerId: 'non-existent-provider', completedAt: 1000 },
      ];
      const providers = [mockProvider1, mockProvider2, mockTransakProvider];

      const result = determinePreferredProvider(completedOrders, providers);

      expect(result).toEqual(mockTransakProvider);
    });
  });

  describe('when user has no orders', () => {
    it('returns Transak provider if available', () => {
      const providers = [mockProvider1, mockProvider2, mockTransakProvider];

      const result = determinePreferredProvider([], providers);

      expect(result).toEqual(mockTransakProvider);
    });

    it('returns first provider if Transak is not available', () => {
      const providers = [mockProvider1, mockProvider2];

      const result = determinePreferredProvider([], providers);

      expect(result).toEqual(mockProvider1);
    });
  });

  describe('provider matching', () => {
    it('matches provider by id case-insensitively', () => {
      const completedOrders = [{ providerId: 'PROVIDER-1', completedAt: 1000 }];
      const providers = [mockProvider1, mockProvider2];

      const result = determinePreferredProvider(completedOrders, providers);

      expect(result).toEqual(mockProvider1);
    });

    it('matches provider by name case-insensitively', () => {
      const completedOrders = [
        { providerId: 'provider one', completedAt: 1000 },
      ];
      const providers = [mockProvider1, mockProvider2];

      const result = determinePreferredProvider(completedOrders, providers);

      expect(result).toEqual(mockProvider1);
    });

    it('matches Transak by id containing "transak"', () => {
      const completedOrders = [{ providerId: 'TRANSAK', completedAt: 1000 }];
      const transakVariant: Provider = {
        ...mockTransakProvider,
        id: 'transak-provider-v2',
      };
      const providers = [mockProvider1, transakVariant];

      const result = determinePreferredProvider(completedOrders, providers);

      expect(result).toEqual(transakVariant);
    });
  });

  describe('end-to-end with converters', () => {
    it('works with legacy FiatOrders through converter', () => {
      const orders = [
        makeFiatOrder({
          provider: FIAT_ORDER_PROVIDERS.AGGREGATOR,
          createdAt: 2000,
          data: { provider: { id: 'provider-2' } } as Order,
        }),
      ];
      const providers = [mockProvider1, mockProvider2, mockTransakProvider];

      const result = determinePreferredProvider(
        completedOrdersFromFiatOrders(orders),
        providers,
      );

      expect(result).toEqual(mockProvider2);
    });

    it('works with controller RampsOrders through converter', () => {
      const orders = [
        makeRampsOrder({
          createdAt: 2000,
          provider: { id: 'provider-2', name: 'Provider Two' } as Provider,
        }),
      ];
      const providers = [mockProvider1, mockProvider2, mockTransakProvider];

      const result = determinePreferredProvider(
        completedOrdersFromRampsOrders(orders),
        providers,
      );

      expect(result).toEqual(mockProvider2);
    });

    it('picks most recent across both legacy and controller orders', () => {
      const legacyOrders = [
        makeFiatOrder({
          provider: FIAT_ORDER_PROVIDERS.AGGREGATOR,
          createdAt: 1000,
          data: { provider: { id: 'provider-1' } } as Order,
        }),
      ];
      const controllerOrders = [
        makeRampsOrder({
          createdAt: 2000,
          provider: { id: 'provider-2', name: 'Provider Two' } as Provider,
        }),
      ];
      const providers = [mockProvider1, mockProvider2, mockTransakProvider];

      const result = determinePreferredProvider(
        [
          ...completedOrdersFromFiatOrders(legacyOrders),
          ...completedOrdersFromRampsOrders(controllerOrders),
        ],
        providers,
      );

      expect(result).toEqual(mockProvider2);
    });
  });
});
