import { RampsOrderStatus, type RampsOrder } from '@metamask/ramps-controller';
import { FIAT_ORDER_PROVIDERS } from '../../../../constants/on-ramp';
import { type FiatOrder } from '../../../../reducers/fiatOrders';
import {
  fiatOrderToDisplayOrder,
  rampsOrderToDisplayOrder,
  mergeDisplayOrders,
} from './displayOrder';

jest.mock('../../../../reducers/fiatOrders', () => ({
  ...jest.requireActual('../../../../reducers/fiatOrders'),
  getProviderName: jest.fn(
    (provider: FIAT_ORDER_PROVIDERS) => `MockProvider_${provider}`,
  ),
}));

const createMockFiatOrder = (
  overrides: Partial<FiatOrder> = {},
): FiatOrder => ({
  id: 'legacy-1',
  provider: FIAT_ORDER_PROVIDERS.AGGREGATOR,
  createdAt: 1000,
  amount: '100',
  currency: 'USD',
  cryptocurrency: 'ETH',
  state: 'COMPLETED' as FiatOrder['state'],
  account: '0xabc',
  network: '1',
  excludeFromPurchases: false,
  orderType: 'BUY' as FiatOrder['orderType'],
  data: {} as FiatOrder['data'],
  ...overrides,
});

const createMockRampsOrder = (
  overrides: Partial<RampsOrder> = {},
): RampsOrder => ({
  isOnlyLink: false,
  success: true,
  cryptoAmount: '0.5',
  fiatAmount: 100,
  providerOrderId: 'v2-1',
  providerOrderLink: 'https://example.com/order/1',
  createdAt: 2000,
  totalFeesFiat: 5,
  txHash: '0xdef',
  walletAddress: '0x123',
  status: RampsOrderStatus.Completed,
  network: { name: 'Ethereum', chainId: 'eip155:1' },
  canBeUpdated: false,
  idHasExpired: false,
  excludeFromPurchases: false,
  timeDescriptionPending: '5-10 minutes',
  orderType: 'BUY',
  provider: {
    id: 'test-provider',
    name: 'TestProvider',
    environmentType: 'PRODUCTION',
    description: '',
    hqAddress: '',
    links: [],
    logos: { light: '', dark: '', height: 24, width: 79 },
  },
  cryptoCurrency: { symbol: 'ETH' },
  fiatCurrency: { symbol: 'USD' },
  ...overrides,
});

describe('displayOrder', () => {
  describe('fiatOrderToDisplayOrder', () => {
    it('converts a legacy FiatOrder to a DisplayOrder', () => {
      const fiatOrder = createMockFiatOrder();
      const result = fiatOrderToDisplayOrder(fiatOrder);
      expect(result).toMatchSnapshot();
    });

    it('defaults cryptoAmount to 0 when undefined', () => {
      const fiatOrder = createMockFiatOrder({ cryptoAmount: undefined });
      const result = fiatOrderToDisplayOrder(fiatOrder);
      expect(result.cryptoAmount).toBe(0);
    });
  });

  describe('rampsOrderToDisplayOrder', () => {
    it('converts a V2 RampsOrder to a DisplayOrder', () => {
      const order = createMockRampsOrder();
      const result = rampsOrderToDisplayOrder(order);
      expect(result).toMatchSnapshot();
    });

    it('maps all RampsOrderStatus values to display strings', () => {
      const statusMappings: {
        input: RampsOrderStatus;
        expected: string;
      }[] = [
        { input: RampsOrderStatus.Pending, expected: 'PENDING' },
        { input: RampsOrderStatus.Created, expected: 'CREATED' },
        { input: RampsOrderStatus.Precreated, expected: 'CREATED' },
        { input: RampsOrderStatus.Unknown, expected: 'PENDING' },
        { input: RampsOrderStatus.Completed, expected: 'COMPLETED' },
        { input: RampsOrderStatus.Failed, expected: 'FAILED' },
        { input: RampsOrderStatus.Cancelled, expected: 'CANCELLED' },
        { input: RampsOrderStatus.IdExpired, expected: 'FAILED' },
      ];

      for (const { input, expected } of statusMappings) {
        const order = createMockRampsOrder({ status: input });
        expect(rampsOrderToDisplayOrder(order).status).toBe(expected);
      }
    });

    it('handles missing optional fields gracefully', () => {
      const order = createMockRampsOrder({
        provider: undefined,
        cryptoCurrency: undefined,
        fiatCurrency: undefined,
        network: { name: '', chainId: '' },
      });
      const result = rampsOrderToDisplayOrder(order);

      expect(result.providerName).toBe('');
      expect(result.cryptoCurrencySymbol).toBe('');
      expect(result.fiatCurrencyCode).toBe('');
      expect(result.network).toBe('');
    });

    it('converts a string createdAt (ISO date) to epoch milliseconds', () => {
      const order = createMockRampsOrder({
        createdAt: '2025-01-01T00:00:00.000Z' as unknown as number,
      });
      const result = rampsOrderToDisplayOrder(order);
      expect(result.createdAt).toBe(
        new Date('2025-01-01T00:00:00.000Z').getTime(),
      );
    });

    it('falls back to 0 when createdAt is null', () => {
      const order = createMockRampsOrder({
        createdAt: null as unknown as number,
      });
      const result = rampsOrderToDisplayOrder(order);
      expect(result.createdAt).toBe(0);
    });
  });

  describe('mergeDisplayOrders', () => {
    it('merges legacy and V2 orders sorted by createdAt descending', () => {
      const legacyOrder = createMockFiatOrder({ createdAt: 1000 });
      const v2Order = createMockRampsOrder({ createdAt: 2000 });

      const result = mergeDisplayOrders([legacyOrder], [v2Order]);

      expect(result).toHaveLength(2);
      expect(result[0].source).toBe('v2');
      expect(result[1].source).toBe('legacy');
    });

    it('filters out legacy orders with RAMPS_V2 provider', () => {
      const legacyOrder = createMockFiatOrder({
        provider: FIAT_ORDER_PROVIDERS.AGGREGATOR,
      });
      const v2LegacyOrder = createMockFiatOrder({
        id: 'v2-legacy',
        provider: FIAT_ORDER_PROVIDERS.RAMPS_V2,
      });
      const v2Order = createMockRampsOrder();

      const result = mergeDisplayOrders(
        [legacyOrder, v2LegacyOrder],
        [v2Order],
      );

      expect(result).toHaveLength(2);
      expect(result.find((o) => o.id === 'v2-legacy')).toBeUndefined();
    });

    it('returns empty array when no orders exist', () => {
      const result = mergeDisplayOrders([], []);
      expect(result).toEqual([]);
    });

    it('handles only legacy orders', () => {
      const legacyOrder = createMockFiatOrder();
      const result = mergeDisplayOrders([legacyOrder], []);

      expect(result).toHaveLength(1);
      expect(result[0].source).toBe('legacy');
    });

    it('handles only V2 orders', () => {
      const v2Order = createMockRampsOrder();
      const result = mergeDisplayOrders([], [v2Order]);

      expect(result).toHaveLength(1);
      expect(result[0].source).toBe('v2');
    });

    it('sorts multiple orders by createdAt descending', () => {
      const orders = [
        createMockFiatOrder({ id: 'a', createdAt: 1000 }),
        createMockFiatOrder({ id: 'b', createdAt: 3000 }),
      ];
      const v2Orders = [
        createMockRampsOrder({ providerOrderId: 'c', createdAt: 2000 }),
        createMockRampsOrder({ providerOrderId: 'd', createdAt: 4000 }),
      ];

      const result = mergeDisplayOrders(orders, v2Orders);

      expect(result.map((o) => o.createdAt)).toEqual([4000, 3000, 2000, 1000]);
    });

    it('sorts V2 orders with string createdAt correctly among legacy orders', () => {
      const legacyOrder = createMockFiatOrder({
        createdAt: new Date('2024-06-01T00:00:00.000Z').getTime(),
      });
      const v2Order = createMockRampsOrder({
        createdAt: '2025-01-01T00:00:00.000Z' as unknown as number,
      });

      const result = mergeDisplayOrders([legacyOrder], [v2Order]);

      expect(result[0].source).toBe('v2');
      expect(result[1].source).toBe('legacy');
    });
  });
});
