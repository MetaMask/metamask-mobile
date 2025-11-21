import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { waitFor } from '@testing-library/react-native';
import { useRampsButtonClickData } from './useRampsButtonClickData';
import {
  FiatOrder,
  UnifiedRampRoutingType,
} from '../../../../reducers/fiatOrders/types';
import {
  FIAT_ORDER_PROVIDERS,
  FIAT_ORDER_STATES,
} from '../../../../constants/on-ramp';
import { Order } from '@consensys/on-ramp-sdk';
import { NativeTransakAccessToken } from '@consensys/native-ramps-sdk';
import initialRootState from '../../../../util/test/initial-root-state';
import { getProviderToken } from '../Deposit/utils/ProviderTokenVault';

jest.mock('../Deposit/utils/ProviderTokenVault', () => ({
  getProviderToken: jest.fn(),
}));

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

const mockGetProviderToken = getProviderToken as jest.MockedFunction<
  typeof getProviderToken
>;

describe('useRampsButtonClickData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetProviderToken.mockResolvedValue({
      success: false,
      error: 'No token found',
    });
  });

  describe('order_count', () => {
    it('returns correct order count', async () => {
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
        () => useRampsButtonClickData(),
        { state: createMockState(orders) },
      );

      await waitFor(() => {
        expect(result.current.order_count).toBe(2);
      });
    });

    it('returns 0 when no orders exist', async () => {
      const { result } = renderHookWithProvider(
        () => useRampsButtonClickData(),
        { state: createMockState([]) },
      );

      await waitFor(() => {
        expect(result.current.order_count).toBe(0);
      });
    });
  });

  describe('preferred_provider', () => {
    it('returns provider id for AGGREGATOR orders', async () => {
      const orders = [
        createMockOrder(
          FIAT_ORDER_PROVIDERS.AGGREGATOR,
          FIAT_ORDER_STATES.COMPLETED,
          1000,
          'test-provider-id',
        ),
      ];

      const { result } = renderHookWithProvider(
        () => useRampsButtonClickData(),
        { state: createMockState(orders) },
      );

      await waitFor(() => {
        expect(result.current.preferred_provider).toBe('test-provider-id');
      });
    });

    it('returns TRANSAK for DEPOSIT orders', async () => {
      const orders = [
        createMockOrder(
          FIAT_ORDER_PROVIDERS.DEPOSIT,
          FIAT_ORDER_STATES.COMPLETED,
          1000,
        ),
      ];

      const { result } = renderHookWithProvider(
        () => useRampsButtonClickData(),
        { state: createMockState(orders) },
      );

      await waitFor(() => {
        expect(result.current.preferred_provider).toBe('TRANSAK');
      });
    });

    it('returns TRANSAK for TRANSAK orders', async () => {
      const orders = [
        createMockOrder(
          FIAT_ORDER_PROVIDERS.TRANSAK,
          FIAT_ORDER_STATES.COMPLETED,
          1000,
        ),
      ];

      const { result } = renderHookWithProvider(
        () => useRampsButtonClickData(),
        { state: createMockState(orders) },
      );

      await waitFor(() => {
        expect(result.current.preferred_provider).toBe('TRANSAK');
      });
    });

    it('returns provider name for other providers', async () => {
      const orders = [
        createMockOrder(
          FIAT_ORDER_PROVIDERS.MOONPAY,
          FIAT_ORDER_STATES.COMPLETED,
          1000,
        ),
      ];

      const { result } = renderHookWithProvider(
        () => useRampsButtonClickData(),
        { state: createMockState(orders) },
      );

      await waitFor(() => {
        expect(result.current.preferred_provider).toBe(
          FIAT_ORDER_PROVIDERS.MOONPAY,
        );
      });
    });

    it('returns undefined when no completed orders exist', async () => {
      const orders = [
        createMockOrder(
          FIAT_ORDER_PROVIDERS.AGGREGATOR,
          FIAT_ORDER_STATES.PENDING,
          1000,
        ),
      ];

      const { result } = renderHookWithProvider(
        () => useRampsButtonClickData(),
        { state: createMockState(orders) },
      );

      await waitFor(() => {
        expect(result.current.preferred_provider).toBeUndefined();
      });
    });

    it('returns provider from most recent completed order', async () => {
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
        () => useRampsButtonClickData(),
        { state: createMockState(orders) },
      );

      await waitFor(() => {
        expect(result.current.preferred_provider).toBe('new-provider');
      });
    });
  });

  describe('ramp_routing', () => {
    it('returns DEPOSIT when routing decision is DEPOSIT', async () => {
      const { result } = renderHookWithProvider(
        () => useRampsButtonClickData(),
        { state: createMockState([], UnifiedRampRoutingType.DEPOSIT) },
      );

      await waitFor(() => {
        expect(result.current.ramp_routing).toBe(
          UnifiedRampRoutingType.DEPOSIT,
        );
      });
    });

    it('returns AGGREGATOR when routing decision is AGGREGATOR', async () => {
      const { result } = renderHookWithProvider(
        () => useRampsButtonClickData(),
        { state: createMockState([], UnifiedRampRoutingType.AGGREGATOR) },
      );

      await waitFor(() => {
        expect(result.current.ramp_routing).toBe(
          UnifiedRampRoutingType.AGGREGATOR,
        );
      });
    });

    it('returns UNSUPPORTED when routing decision is UNSUPPORTED', async () => {
      const { result } = renderHookWithProvider(
        () => useRampsButtonClickData(),
        { state: createMockState([], UnifiedRampRoutingType.UNSUPPORTED) },
      );

      await waitFor(() => {
        expect(result.current.ramp_routing).toBe(
          UnifiedRampRoutingType.UNSUPPORTED,
        );
      });
    });

    it('returns ERROR when routing decision is ERROR', async () => {
      const { result } = renderHookWithProvider(
        () => useRampsButtonClickData(),
        { state: createMockState([], UnifiedRampRoutingType.ERROR) },
      );

      await waitFor(() => {
        expect(result.current.ramp_routing).toBe(UnifiedRampRoutingType.ERROR);
      });
    });
  });

  describe('is_authenticated', () => {
    it('returns false immediately before async check completes', () => {
      mockGetProviderToken.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                success: true,
                token: {
                  accessToken: 'test-token',
                  ttl: 3600,
                  created: new Date('2024-01-01'),
                },
              });
            }, 100);
          }),
      );

      const { result } = renderHookWithProvider(() =>
        useRampsButtonClickData(),
      );

      expect(result.current.is_authenticated).toBe(false);
    });

    it('returns true when provider token exists and is valid', async () => {
      mockGetProviderToken.mockResolvedValue({
        success: true,
        token: {
          accessToken: 'test-token',
          ttl: 3600,
          created: new Date('2024-01-01'),
        },
      });

      const { result } = renderHookWithProvider(() =>
        useRampsButtonClickData(),
      );

      await waitFor(() => {
        expect(result.current.is_authenticated).toBe(true);
      });
    });

    it('returns false when provider token does not exist', async () => {
      mockGetProviderToken.mockResolvedValue({
        success: false,
        error: 'No token found',
      });

      const { result } = renderHookWithProvider(() =>
        useRampsButtonClickData(),
      );

      await waitFor(() => {
        expect(result.current.is_authenticated).toBe(false);
      });
    });

    it('returns false when provider token exists but has no accessToken', async () => {
      mockGetProviderToken.mockResolvedValue({
        success: true,
        token: {
          ttl: 3600,
        } as NativeTransakAccessToken,
      });

      const { result } = renderHookWithProvider(() =>
        useRampsButtonClickData(),
      );

      await waitFor(() => {
        expect(result.current.is_authenticated).toBe(false);
      });
    });

    it('returns false when getProviderToken throws an error', async () => {
      mockGetProviderToken.mockRejectedValue(new Error('Token error'));

      const { result } = renderHookWithProvider(() =>
        useRampsButtonClickData(),
      );

      await waitFor(() => {
        expect(result.current.is_authenticated).toBe(false);
      });
    });
  });

  describe('combined scenarios', () => {
    it('returns all properties correctly', async () => {
      mockGetProviderToken.mockResolvedValue({
        success: true,
        token: {
          accessToken: 'test-token',
          ttl: 3600,
          created: new Date('2024-01-01'),
        },
      });

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
        () => useRampsButtonClickData(),
        {
          state: createMockState(orders, UnifiedRampRoutingType.AGGREGATOR),
        },
      );

      await waitFor(() => {
        expect(result.current).toEqual({
          ramp_routing: UnifiedRampRoutingType.AGGREGATOR,
          is_authenticated: true,
          preferred_provider: 'test-provider',
          order_count: 2,
        });
      });
    });
  });
});
