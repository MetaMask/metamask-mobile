import { renderHook, waitFor } from '@testing-library/react-native';
import useRampsSmartRouting, {
  RampEligibilityAPIResponse,
} from './useRampsSmartRouting';
import {
  FiatOrder,
  UnifiedRampRoutingType,
} from '../../../../reducers/fiatOrders/types';
import {
  FIAT_ORDER_PROVIDERS,
  FIAT_ORDER_STATES,
} from '../../../../constants/on-ramp';
import { RootState } from '../../../../reducers';

const mockDispatch = jest.fn();
const mockUseSelector = jest.fn();
const mockFetch = jest.fn();
const mockUseRampsUnifiedV1Enabled = jest.fn();

global.fetch = mockFetch as jest.Mock;

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
  useSelector: (selector: (state: RootState) => RootState['fiatOrders']) =>
    mockUseSelector(selector),
}));

jest.mock('./useRampsUnifiedV1Enabled', () => ({
  __esModule: true,
  default: () => mockUseRampsUnifiedV1Enabled(),
}));

let mockOrders: FiatOrder[] = [];
let mockDetectedGeolocation: string | undefined;

const createMockOrder = (
  provider: FIAT_ORDER_PROVIDERS,
  state: FIAT_ORDER_STATES,
  createdAt: number,
): FiatOrder =>
  ({
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
  }) as FiatOrder;

const mockApiResponse = ({
  deposit,
  aggregator,
  global,
}: RampEligibilityAPIResponse) => {
  mockFetch.mockImplementation(async () => ({
    json: async () => ({ deposit, aggregator, global }),
  }));
};

describe('useRampsSmartRouting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOrders = [];
    mockDetectedGeolocation = 'US';
    mockApiResponse({
      deposit: true,
      aggregator: false,
      global: true,
    });
    mockUseRampsUnifiedV1Enabled.mockReturnValue(true);

    mockUseSelector.mockImplementation((selector) => {
      const state = {
        fiatOrders: {
          orders: mockOrders,
          detectedGeolocation: mockDetectedGeolocation,
        },
      };
      return selector(state);
    });
  });

  describe('Feature flag check', () => {
    it('does nothing when unifiedV1Enabled is false', async () => {
      mockUseRampsUnifiedV1Enabled.mockReturnValue(false);
      mockApiResponse({
        deposit: true,
        aggregator: false,
        global: true,
      });
      mockOrders = [];

      renderHook(() => useRampsSmartRouting());

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockDispatch).not.toHaveBeenCalled();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('executes normally when unifiedV1Enabled is true', async () => {
      mockUseRampsUnifiedV1Enabled.mockReturnValue(true);
      mockApiResponse({
        deposit: true,
        aggregator: false,
        global: true,
      });
      mockOrders = [];

      renderHook(() => useRampsSmartRouting());

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalled();
      });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Region support check', () => {
    it('routes to UNSUPPORTED when API returns global: false', async () => {
      mockApiResponse({
        deposit: false,
        aggregator: false,
        global: false,
      });
      mockOrders = [];

      renderHook(() => useRampsSmartRouting());

      await waitFor(() =>
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'FIAT_SET_RAMP_ROUTING_DECISION',
          payload: UnifiedRampRoutingType.UNSUPPORTED,
        }),
      );
    });

    it('routes to UNSUPPORTED when API returns global: false regardless of orders', async () => {
      mockApiResponse({
        deposit: false,
        aggregator: false,
        global: false,
      });
      mockOrders = [
        createMockOrder(
          FIAT_ORDER_PROVIDERS.TRANSAK,
          FIAT_ORDER_STATES.COMPLETED,
          1000,
        ),
      ];

      renderHook(() => useRampsSmartRouting());

      await waitFor(() =>
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'FIAT_SET_RAMP_ROUTING_DECISION',
          payload: UnifiedRampRoutingType.UNSUPPORTED,
        }),
      );
    });

    it('routes to AGGREGATOR when API returns deposit: false and global: true', async () => {
      mockApiResponse({
        deposit: false,
        aggregator: true,
        global: true,
      });
      mockOrders = [];

      renderHook(() => useRampsSmartRouting());

      await waitFor(() =>
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'FIAT_SET_RAMP_ROUTING_DECISION',
          payload: UnifiedRampRoutingType.AGGREGATOR,
        }),
      );
    });

    it('routes to AGGREGATOR when deposit unsupported regardless of orders', async () => {
      mockApiResponse({
        deposit: false,
        aggregator: false,
        global: true,
      });
      mockOrders = [
        createMockOrder(
          FIAT_ORDER_PROVIDERS.TRANSAK,
          FIAT_ORDER_STATES.COMPLETED,
          1000,
        ),
      ];

      renderHook(() => useRampsSmartRouting());

      await waitFor(() =>
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'FIAT_SET_RAMP_ROUTING_DECISION',
          payload: UnifiedRampRoutingType.AGGREGATOR,
        }),
      );
    });

    it('continues to order check when API returns deposit: true, global: true', async () => {
      mockApiResponse({
        deposit: true,
        aggregator: false,
        global: true,
      });
      mockOrders = [];

      renderHook(() => useRampsSmartRouting());

      await waitFor(() =>
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'FIAT_SET_RAMP_ROUTING_DECISION',
          payload: UnifiedRampRoutingType.DEPOSIT,
        }),
      );
    });

    it('routes to ERROR when geolocation is not detected', async () => {
      mockDetectedGeolocation = undefined;
      mockOrders = [];

      renderHook(() => useRampsSmartRouting());

      await waitFor(() =>
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'FIAT_SET_RAMP_ROUTING_DECISION',
          payload: UnifiedRampRoutingType.ERROR,
        }),
      );

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('routes to ERROR when API fetch fails', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      mockOrders = [];

      renderHook(() => useRampsSmartRouting());

      await waitFor(() =>
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'FIAT_SET_RAMP_ROUTING_DECISION',
          payload: UnifiedRampRoutingType.ERROR,
        }),
      );
    });
  });

  describe('Order history check', () => {
    it('routes to DEPOSIT when there are no completed orders', async () => {
      mockApiResponse({
        deposit: true,
        aggregator: true,
        global: true,
      });
      mockOrders = [];

      renderHook(() => useRampsSmartRouting());

      await waitFor(() =>
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'FIAT_SET_RAMP_ROUTING_DECISION',
          payload: UnifiedRampRoutingType.DEPOSIT,
        }),
      );
    });

    it('routes to DEPOSIT when all orders are pending', async () => {
      mockApiResponse({
        deposit: true,
        aggregator: true,
        global: true,
      });
      mockOrders = [
        createMockOrder(
          FIAT_ORDER_PROVIDERS.AGGREGATOR,
          FIAT_ORDER_STATES.PENDING,
          1000,
        ),
        createMockOrder(
          FIAT_ORDER_PROVIDERS.TRANSAK,
          FIAT_ORDER_STATES.PENDING,
          2000,
        ),
      ];

      renderHook(() => useRampsSmartRouting());

      await waitFor(() =>
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'FIAT_SET_RAMP_ROUTING_DECISION',
          payload: UnifiedRampRoutingType.DEPOSIT,
        }),
      );
    });

    it('routes to DEPOSIT when all orders are failed', async () => {
      mockApiResponse({
        deposit: true,
        aggregator: true,
        global: true,
      });
      mockOrders = [
        createMockOrder(
          FIAT_ORDER_PROVIDERS.AGGREGATOR,
          FIAT_ORDER_STATES.FAILED,
          1000,
        ),
        createMockOrder(
          FIAT_ORDER_PROVIDERS.TRANSAK,
          FIAT_ORDER_STATES.FAILED,
          2000,
        ),
      ];

      renderHook(() => useRampsSmartRouting());

      await waitFor(() =>
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'FIAT_SET_RAMP_ROUTING_DECISION',
          payload: UnifiedRampRoutingType.DEPOSIT,
        }),
      );
    });

    it('routes to DEPOSIT when all orders are cancelled', async () => {
      mockApiResponse({
        deposit: true,
        aggregator: true,
        global: true,
      });
      mockOrders = [
        createMockOrder(
          FIAT_ORDER_PROVIDERS.AGGREGATOR,
          FIAT_ORDER_STATES.CANCELLED,
          1000,
        ),
      ];

      renderHook(() => useRampsSmartRouting());

      await waitFor(() =>
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'FIAT_SET_RAMP_ROUTING_DECISION',
          payload: UnifiedRampRoutingType.DEPOSIT,
        }),
      );
    });
  });

  describe('Provider-based routing with Transak', () => {
    it('routes to DEPOSIT when last completed order is from Transak', async () => {
      mockApiResponse({
        deposit: true,
        aggregator: true,
        global: true,
      });
      mockOrders = [
        createMockOrder(
          FIAT_ORDER_PROVIDERS.TRANSAK,
          FIAT_ORDER_STATES.COMPLETED,
          5000,
        ),
        createMockOrder(
          FIAT_ORDER_PROVIDERS.AGGREGATOR,
          FIAT_ORDER_STATES.COMPLETED,
          3000,
        ),
      ];

      renderHook(() => useRampsSmartRouting());

      await waitFor(() =>
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'FIAT_SET_RAMP_ROUTING_DECISION',
          payload: UnifiedRampRoutingType.DEPOSIT,
        }),
      );
    });

    it('routes to DEPOSIT when only completed order is from Transak', async () => {
      mockApiResponse({
        deposit: true,
        aggregator: true,
        global: true,
      });
      mockOrders = [
        createMockOrder(
          FIAT_ORDER_PROVIDERS.TRANSAK,
          FIAT_ORDER_STATES.COMPLETED,
          1000,
        ),
      ];

      renderHook(() => useRampsSmartRouting());

      await waitFor(() =>
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'FIAT_SET_RAMP_ROUTING_DECISION',
          payload: UnifiedRampRoutingType.DEPOSIT,
        }),
      );
    });

    it('routes to DEPOSIT when Transak is most recent among mixed states', async () => {
      mockApiResponse({
        deposit: true,
        aggregator: true,
        global: true,
      });
      mockOrders = [
        createMockOrder(
          FIAT_ORDER_PROVIDERS.TRANSAK,
          FIAT_ORDER_STATES.COMPLETED,
          5000,
        ),
        createMockOrder(
          FIAT_ORDER_PROVIDERS.AGGREGATOR,
          FIAT_ORDER_STATES.PENDING,
          6000,
        ),
        createMockOrder(
          FIAT_ORDER_PROVIDERS.MOONPAY,
          FIAT_ORDER_STATES.COMPLETED,
          3000,
        ),
      ];

      renderHook(() => useRampsSmartRouting());

      await waitFor(() =>
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'FIAT_SET_RAMP_ROUTING_DECISION',
          payload: UnifiedRampRoutingType.DEPOSIT,
        }),
      );
    });
  });

  describe('Provider-based routing without Transak', () => {
    it('routes to AGGREGATOR when last completed order is from Aggregator', async () => {
      mockApiResponse({
        deposit: true,
        aggregator: true,
        global: true,
      });
      mockOrders = [
        createMockOrder(
          FIAT_ORDER_PROVIDERS.AGGREGATOR,
          FIAT_ORDER_STATES.COMPLETED,
          5000,
        ),
        createMockOrder(
          FIAT_ORDER_PROVIDERS.TRANSAK,
          FIAT_ORDER_STATES.COMPLETED,
          3000,
        ),
      ];

      renderHook(() => useRampsSmartRouting());

      await waitFor(() =>
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'FIAT_SET_RAMP_ROUTING_DECISION',
          payload: UnifiedRampRoutingType.AGGREGATOR,
        }),
      );
    });

    it('routes to AGGREGATOR when last completed order is from MoonPay', async () => {
      mockApiResponse({
        deposit: true,
        aggregator: true,
        global: true,
      });
      mockOrders = [
        createMockOrder(
          FIAT_ORDER_PROVIDERS.MOONPAY,
          FIAT_ORDER_STATES.COMPLETED,
          4000,
        ),
      ];

      renderHook(() => useRampsSmartRouting());

      await waitFor(() =>
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'FIAT_SET_RAMP_ROUTING_DECISION',
          payload: UnifiedRampRoutingType.AGGREGATOR,
        }),
      );
    });

    it('routes to AGGREGATOR when last completed order is from Wyre', async () => {
      mockApiResponse({
        deposit: true,
        aggregator: false,
        global: true,
      });
      mockOrders = [
        createMockOrder(
          FIAT_ORDER_PROVIDERS.WYRE,
          FIAT_ORDER_STATES.COMPLETED,
          3000,
        ),
      ];

      renderHook(() => useRampsSmartRouting());

      await waitFor(() =>
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'FIAT_SET_RAMP_ROUTING_DECISION',
          payload: UnifiedRampRoutingType.AGGREGATOR,
        }),
      );
    });

    it('routes to AGGREGATOR when last completed order is from Deposit provider', async () => {
      mockApiResponse({
        deposit: true,
        aggregator: false,
        global: true,
      });
      mockOrders = [
        createMockOrder(
          FIAT_ORDER_PROVIDERS.DEPOSIT,
          FIAT_ORDER_STATES.COMPLETED,
          3000,
        ),
      ];

      renderHook(() => useRampsSmartRouting());

      await waitFor(() =>
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'FIAT_SET_RAMP_ROUTING_DECISION',
          payload: UnifiedRampRoutingType.AGGREGATOR,
        }),
      );
    });
  });

  describe('Order sorting by timestamp', () => {
    it('uses most recent completed order when multiple completed orders exist', async () => {
      mockApiResponse({
        deposit: true,
        aggregator: true,
        global: true,
      });
      mockOrders = [
        createMockOrder(
          FIAT_ORDER_PROVIDERS.TRANSAK,
          FIAT_ORDER_STATES.COMPLETED,
          1000,
        ),
        createMockOrder(
          FIAT_ORDER_PROVIDERS.MOONPAY,
          FIAT_ORDER_STATES.COMPLETED,
          3000,
        ),
        createMockOrder(
          FIAT_ORDER_PROVIDERS.AGGREGATOR,
          FIAT_ORDER_STATES.COMPLETED,
          2000,
        ),
      ];

      renderHook(() => useRampsSmartRouting());

      await waitFor(() =>
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'FIAT_SET_RAMP_ROUTING_DECISION',
          payload: UnifiedRampRoutingType.AGGREGATOR,
        }),
      );
    });

    it('ignores pending orders when determining last completed order', async () => {
      mockApiResponse({
        deposit: true,
        aggregator: true,
        global: true,
      });
      mockOrders = [
        createMockOrder(
          FIAT_ORDER_PROVIDERS.MOONPAY,
          FIAT_ORDER_STATES.PENDING,
          9999,
        ),
        createMockOrder(
          FIAT_ORDER_PROVIDERS.TRANSAK,
          FIAT_ORDER_STATES.COMPLETED,
          5000,
        ),
        createMockOrder(
          FIAT_ORDER_PROVIDERS.AGGREGATOR,
          FIAT_ORDER_STATES.COMPLETED,
          3000,
        ),
      ];

      renderHook(() => useRampsSmartRouting());

      await waitFor(() =>
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'FIAT_SET_RAMP_ROUTING_DECISION',
          payload: UnifiedRampRoutingType.DEPOSIT,
        }),
      );
    });
  });

  describe('Hook lifecycle', () => {
    it('determines routing decision on mount', async () => {
      mockApiResponse({
        deposit: true,
        aggregator: true,
        global: true,
      });
      mockOrders = [];

      renderHook(() => useRampsSmartRouting());

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledTimes(1);
      });
    });

    it('updates routing decision when orders change', async () => {
      mockApiResponse({
        deposit: true,
        aggregator: true,
        global: true,
      });
      mockOrders = [];

      const { rerender } = renderHook(() => useRampsSmartRouting());

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'FIAT_SET_RAMP_ROUTING_DECISION',
          payload: UnifiedRampRoutingType.DEPOSIT,
        });
      });

      mockDispatch.mockClear();
      mockOrders = [
        createMockOrder(
          FIAT_ORDER_PROVIDERS.AGGREGATOR,
          FIAT_ORDER_STATES.COMPLETED,
          1000,
        ),
      ];

      rerender({});

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'FIAT_SET_RAMP_ROUTING_DECISION',
          payload: UnifiedRampRoutingType.AGGREGATOR,
        });
      });
    });

    it('updates routing decision when API response changes', async () => {
      mockApiResponse({
        deposit: false,
        aggregator: true,
        global: true,
      });
      mockOrders = [];

      const { rerender } = renderHook(() => useRampsSmartRouting());

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'FIAT_SET_RAMP_ROUTING_DECISION',
          payload: UnifiedRampRoutingType.AGGREGATOR,
        });
      });

      mockDispatch.mockClear();
      mockApiResponse({
        deposit: true,
        aggregator: false,
        global: true,
      });
      mockDetectedGeolocation = 'UK';

      rerender({});

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'FIAT_SET_RAMP_ROUTING_DECISION',
          payload: UnifiedRampRoutingType.DEPOSIT,
        });
      });
    });
  });

  describe('Edge cases', () => {
    it('handles orders with same timestamp', async () => {
      mockApiResponse({
        deposit: true,
        aggregator: true,
        global: true,
      });
      const sameTimestamp = 5000;
      mockOrders = [
        createMockOrder(
          FIAT_ORDER_PROVIDERS.TRANSAK,
          FIAT_ORDER_STATES.COMPLETED,
          sameTimestamp,
        ),
        createMockOrder(
          FIAT_ORDER_PROVIDERS.AGGREGATOR,
          FIAT_ORDER_STATES.COMPLETED,
          sameTimestamp,
        ),
      ];

      renderHook(() => useRampsSmartRouting());

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'FIAT_SET_RAMP_ROUTING_DECISION',
          payload: expect.any(String),
        });
      });
    });

    it('handles mix of completed and non-completed orders', async () => {
      mockApiResponse({
        deposit: true,
        aggregator: true,
        global: true,
      });
      mockOrders = [
        createMockOrder(
          FIAT_ORDER_PROVIDERS.MOONPAY,
          FIAT_ORDER_STATES.PENDING,
          9000,
        ),
        createMockOrder(
          FIAT_ORDER_PROVIDERS.TRANSAK,
          FIAT_ORDER_STATES.COMPLETED,
          5000,
        ),
        createMockOrder(
          FIAT_ORDER_PROVIDERS.AGGREGATOR,
          FIAT_ORDER_STATES.FAILED,
          8000,
        ),
        createMockOrder(
          FIAT_ORDER_PROVIDERS.DEPOSIT,
          FIAT_ORDER_STATES.CANCELLED,
          7000,
        ),
      ];

      renderHook(() => useRampsSmartRouting());

      await waitFor(() =>
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'FIAT_SET_RAMP_ROUTING_DECISION',
          payload: UnifiedRampRoutingType.DEPOSIT,
        }),
      );
    });

    it('handles orders array with created state', async () => {
      mockApiResponse({
        deposit: true,
        aggregator: true,
        global: true,
      });
      mockOrders = [
        createMockOrder(
          FIAT_ORDER_PROVIDERS.TRANSAK,
          FIAT_ORDER_STATES.CREATED,
          1000,
        ),
      ];

      renderHook(() => useRampsSmartRouting());

      await waitFor(() =>
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'FIAT_SET_RAMP_ROUTING_DECISION',
          payload: UnifiedRampRoutingType.DEPOSIT,
        }),
      );
    });
  });
});
