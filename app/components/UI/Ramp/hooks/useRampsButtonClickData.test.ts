import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import {
  useRampsButtonClickData,
  RampsButtonClickDataRampRouting,
} from './useRampsButtonClickData';
import {
  FiatOrder,
  UnifiedRampRoutingType,
} from '../../../../reducers/fiatOrders/types';
import {
  FIAT_ORDER_PROVIDERS,
  FIAT_ORDER_STATES,
} from '../../../../constants/on-ramp';
import { Order } from '@consensys/on-ramp-sdk';
import initialRootState from '../../../../util/test/initial-root-state';

jest.mock(
  '../../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    ...jest.requireActual(
      '../../../../selectors/multichainAccounts/accountTreeController',
    ),
    selectSelectedAccountGroupWithInternalAccountsAddresses: () => ['0x123'],
  }),
);

const createMockOrder = (
  provider: FIAT_ORDER_PROVIDERS,
  state: FIAT_ORDER_STATES,
  createdAt: number,
  providerId?: string,
): FiatOrder => {
  const order: FiatOrder = {
    id: `order-${createdAt}`,
    provider,
    state,
    createdAt,
    amount: 100,
    currency: 'USD',
    cryptocurrency: 'ETH',
    account: '0x123',
    network: '1',
    excludeFromPurchases: false,
    orderType: 'BUY',
    data: {},
  } as FiatOrder;

  if (provider === FIAT_ORDER_PROVIDERS.AGGREGATOR && providerId) {
    order.data = {
      provider: {
        id: providerId,
        name: 'Test Provider',
      },
    } as Order;
  }

  return order;
};

const createMockState = (
  orders: FiatOrder[] = [],
  rampRoutingDecision: UnifiedRampRoutingType | null = null,
) => ({
  ...initialRootState,
  fiatOrders: {
    ...initialRootState.fiatOrders,
    orders,
    rampRoutingDecision,
  },
});

describe('useRampsButtonClickData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('order_count', () => {
    it('returns correct order count', () => {
      const orders = [
        createMockOrder(
          FIAT_ORDER_PROVIDERS.AGGREGATOR,
          FIAT_ORDER_STATES.COMPLETED,
          1000,
        ),
        createMockOrder(
          FIAT_ORDER_PROVIDERS.DEPOSIT,
          FIAT_ORDER_STATES.PENDING,
          2000,
        ),
      ];

      const { result } = renderHookWithProvider(
        () => useRampsButtonClickData('BUY'),
        { state: createMockState(orders) },
      );

      expect(result.current.order_count).toBe(2);
    });

    it('returns 0 when no orders exist', () => {
      const { result } = renderHookWithProvider(
        () => useRampsButtonClickData('BUY'),
        { state: createMockState([]) },
      );

      expect(result.current.order_count).toBe(0);
    });
  });

  describe('preferred_provider', () => {
    it('returns provider id for AGGREGATOR orders', () => {
      const orders = [
        createMockOrder(
          FIAT_ORDER_PROVIDERS.AGGREGATOR,
          FIAT_ORDER_STATES.COMPLETED,
          1000,
          'test-provider-id',
        ),
      ];

      const { result } = renderHookWithProvider(
        () => useRampsButtonClickData('BUY'),
        { state: createMockState(orders) },
      );

      expect(result.current.preferred_provider).toBe('test-provider-id');
    });

    it('returns TRANSAK for DEPOSIT orders', () => {
      const orders = [
        createMockOrder(
          FIAT_ORDER_PROVIDERS.DEPOSIT,
          FIAT_ORDER_STATES.COMPLETED,
          1000,
        ),
      ];

      const { result } = renderHookWithProvider(
        () => useRampsButtonClickData('DEPOSIT'),
        { state: createMockState(orders) },
      );

      expect(result.current.preferred_provider).toBe('TRANSAK');
    });

    it('returns TRANSAK for TRANSAK orders', () => {
      const orders = [
        createMockOrder(
          FIAT_ORDER_PROVIDERS.TRANSAK,
          FIAT_ORDER_STATES.COMPLETED,
          1000,
        ),
      ];

      const { result } = renderHookWithProvider(
        () => useRampsButtonClickData('BUY'),
        { state: createMockState(orders) },
      );

      expect(result.current.preferred_provider).toBe('TRANSAK');
    });

    it('returns provider name for other providers', () => {
      const orders = [
        createMockOrder(
          FIAT_ORDER_PROVIDERS.MOONPAY,
          FIAT_ORDER_STATES.COMPLETED,
          1000,
        ),
      ];

      const { result } = renderHookWithProvider(
        () => useRampsButtonClickData('BUY'),
        { state: createMockState(orders) },
      );

      expect(result.current.preferred_provider).toBe(
        FIAT_ORDER_PROVIDERS.MOONPAY,
      );
    });

    it('returns undefined when no completed orders exist', () => {
      const orders = [
        createMockOrder(
          FIAT_ORDER_PROVIDERS.AGGREGATOR,
          FIAT_ORDER_STATES.PENDING,
          1000,
        ),
      ];

      const { result } = renderHookWithProvider(
        () => useRampsButtonClickData('BUY'),
        { state: createMockState(orders) },
      );

      expect(result.current.preferred_provider).toBeUndefined();
    });

    it('returns provider from most recent completed order', () => {
      const orders = [
        createMockOrder(
          FIAT_ORDER_PROVIDERS.AGGREGATOR,
          FIAT_ORDER_STATES.COMPLETED,
          1000,
          'old-provider',
        ),
        createMockOrder(
          FIAT_ORDER_PROVIDERS.AGGREGATOR,
          FIAT_ORDER_STATES.COMPLETED,
          2000,
          'new-provider',
        ),
      ];

      const { result } = renderHookWithProvider(
        () => useRampsButtonClickData('BUY'),
        { state: createMockState(orders) },
      );

      expect(result.current.preferred_provider).toBe('new-provider');
    });
  });

  describe('ramp_routing', () => {
    it('returns DEPOSIT when routing decision is DEPOSIT', () => {
      const { result } = renderHookWithProvider(
        () => useRampsButtonClickData('DEPOSIT'),
        { state: createMockState([], UnifiedRampRoutingType.DEPOSIT) },
      );

      expect(result.current.ramp_routing).toBe(
        RampsButtonClickDataRampRouting.DEPOSIT,
      );
    });

    it('returns AGGREGATOR BUY when routing decision is AGGREGATOR and rampType is BUY', () => {
      const { result } = renderHookWithProvider(
        () => useRampsButtonClickData('BUY'),
        { state: createMockState([], UnifiedRampRoutingType.AGGREGATOR) },
      );

      expect(result.current.ramp_routing).toBe(
        RampsButtonClickDataRampRouting.AGGREGATOR_BUY,
      );
    });

    it('returns AGGREGATOR BUY when routing decision is AGGREGATOR and rampType is UNIFIED BUY', () => {
      const { result } = renderHookWithProvider(
        () => useRampsButtonClickData('UNIFIED BUY'),
        { state: createMockState([], UnifiedRampRoutingType.AGGREGATOR) },
      );

      expect(result.current.ramp_routing).toBe(
        RampsButtonClickDataRampRouting.AGGREGATOR_BUY,
      );
    });

    it('returns AGGREGATOR SELL when routing decision is AGGREGATOR and rampType is SELL', () => {
      const { result } = renderHookWithProvider(
        () => useRampsButtonClickData('SELL'),
        { state: createMockState([], UnifiedRampRoutingType.AGGREGATOR) },
      );

      expect(result.current.ramp_routing).toBe(
        RampsButtonClickDataRampRouting.AGGREGATOR_SELL,
      );
    });

    it('returns UNSUPPORTED when routing decision is UNSUPPORTED', () => {
      const { result } = renderHookWithProvider(
        () => useRampsButtonClickData('BUY'),
        { state: createMockState([], UnifiedRampRoutingType.UNSUPPORTED) },
      );

      expect(result.current.ramp_routing).toBe(
        RampsButtonClickDataRampRouting.UNSUPPORTED,
      );
    });

    it('returns ERROR when routing decision is ERROR', () => {
      const { result } = renderHookWithProvider(
        () => useRampsButtonClickData('BUY'),
        { state: createMockState([], UnifiedRampRoutingType.ERROR) },
      );

      expect(result.current.ramp_routing).toBe(
        RampsButtonClickDataRampRouting.ERROR,
      );
    });

    it('returns undefined when routing decision is null', () => {
      const { result } = renderHookWithProvider(
        () => useRampsButtonClickData('BUY'),
        { state: createMockState([], null) },
      );

      expect(result.current.ramp_routing).toBeUndefined();
    });
  });

  describe('is_authenticated', () => {
    it('returns isAuthenticated from options when provided', () => {
      const { result } = renderHookWithProvider(() =>
        useRampsButtonClickData('DEPOSIT', { isAuthenticated: true }),
      );

      expect(result.current.is_authenticated).toBe(true);
    });

    it('returns false when isAuthenticated is false in options', () => {
      const { result } = renderHookWithProvider(() =>
        useRampsButtonClickData('DEPOSIT', { isAuthenticated: false }),
      );

      expect(result.current.is_authenticated).toBe(false);
    });

    it('returns undefined when isAuthenticated is not provided in options', () => {
      const { result } = renderHookWithProvider(() =>
        useRampsButtonClickData('DEPOSIT'),
      );

      expect(result.current.is_authenticated).toBeUndefined();
    });
  });

  describe('combined scenarios', () => {
    it('returns all properties correctly', () => {
      const orders = [
        createMockOrder(
          FIAT_ORDER_PROVIDERS.AGGREGATOR,
          FIAT_ORDER_STATES.COMPLETED,
          1000,
          'test-provider',
        ),
        createMockOrder(
          FIAT_ORDER_PROVIDERS.DEPOSIT,
          FIAT_ORDER_STATES.PENDING,
          2000,
        ),
      ];

      const { result } = renderHookWithProvider(
        () => useRampsButtonClickData('BUY', { isAuthenticated: true }),
        { state: createMockState(orders, UnifiedRampRoutingType.AGGREGATOR) },
      );

      expect(result.current).toEqual({
        ramp_routing: RampsButtonClickDataRampRouting.AGGREGATOR_BUY,
        is_authenticated: true,
        preferred_provider: 'test-provider',
        order_count: 2,
      });
    });
  });
});
