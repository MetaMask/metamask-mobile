import { renderHook, waitFor } from '@testing-library/react-native';
import useRampsSmartRouting from './useRampsSmartRouting';
import {
  FiatOrder,
  RampRoutingType,
  RampRegionSupport,
} from '../../../../reducers/fiatOrders/types';
import {
  FIAT_ORDER_PROVIDERS,
  FIAT_ORDER_STATES,
} from '../../../../constants/on-ramp';
import { RootState } from '../../../../reducers';

const mockDispatch = jest.fn();
const mockUseSelector = jest.fn();

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
  useSelector: (selector: (state: RootState) => RootState['fiatOrders']) =>
    mockUseSelector(selector),
}));

let mockOrders: FiatOrder[] = [];
let mockDetectedGeolocation: string | undefined;
let mockRampRegionSupport: RampRegionSupport = RampRegionSupport.DEPOSIT;

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

describe('useRampsSmartRouting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOrders = [];
    mockDetectedGeolocation = undefined;
    mockRampRegionSupport = RampRegionSupport.DEPOSIT;

    mockUseSelector.mockImplementation((selector) => {
      const state = {
        fiatOrders: {
          orders: mockOrders,
          detectedGeolocation: mockDetectedGeolocation,
          rampRegionSupport: mockRampRegionSupport,
        },
      };
      return selector(state);
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Region support check', () => {
    it('routes to UNSUPPORTED when region support is UNSUPPORTED', async () => {
      mockRampRegionSupport = RampRegionSupport.UNSUPPORTED;
      mockOrders = [];

      renderHook(() => useRampsSmartRouting());

      await waitFor(() =>
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'FIAT_SET_RAMP_ROUTING_DECISION',
          payload: RampRoutingType.UNSUPPORTED,
        }),
      );
    });

    it('routes to UNSUPPORTED when region support is UNSUPPORTED regardless of orders', async () => {
      mockRampRegionSupport = RampRegionSupport.UNSUPPORTED;
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
          payload: RampRoutingType.UNSUPPORTED,
        }),
      );
    });

    it('routes to AGGREGATOR when region support is AGGREGATOR', async () => {
      mockRampRegionSupport = RampRegionSupport.AGGREGATOR;
      mockOrders = [];

      renderHook(() => useRampsSmartRouting());

      await waitFor(() =>
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'FIAT_SET_RAMP_ROUTING_DECISION',
          payload: RampRoutingType.AGGREGATOR,
        }),
      );
    });

    it('routes to AGGREGATOR when region support is AGGREGATOR regardless of orders', async () => {
      mockRampRegionSupport = RampRegionSupport.AGGREGATOR;
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
          payload: RampRoutingType.AGGREGATOR,
        }),
      );
    });

    it('continues to order check when region support is DEPOSIT', async () => {
      mockRampRegionSupport = RampRegionSupport.DEPOSIT;
      mockOrders = [];

      renderHook(() => useRampsSmartRouting());

      await waitFor(() =>
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'FIAT_SET_RAMP_ROUTING_DECISION',
          payload: RampRoutingType.DEPOSIT,
        }),
      );
    });
  });

  describe('Order history check', () => {
    it('routes to DEPOSIT when there are no completed orders', async () => {
      mockRampRegionSupport = RampRegionSupport.DEPOSIT;
      mockOrders = [];

      renderHook(() => useRampsSmartRouting());

      await waitFor(() =>
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'FIAT_SET_RAMP_ROUTING_DECISION',
          payload: RampRoutingType.DEPOSIT,
        }),
      );
    });

    it('routes to DEPOSIT when all orders are pending', async () => {
      mockRampRegionSupport = RampRegionSupport.DEPOSIT;
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
          payload: RampRoutingType.DEPOSIT,
        }),
      );
    });

    it('routes to DEPOSIT when all orders are failed', async () => {
      mockRampRegionSupport = RampRegionSupport.DEPOSIT;
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
          payload: RampRoutingType.DEPOSIT,
        }),
      );
    });

    it('routes to DEPOSIT when all orders are cancelled', async () => {
      mockRampRegionSupport = RampRegionSupport.DEPOSIT;
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
          payload: RampRoutingType.DEPOSIT,
        }),
      );
    });
  });

  describe('Provider-based routing with Transak', () => {
    it('routes to DEPOSIT when last completed order is from Transak', async () => {
      mockRampRegionSupport = RampRegionSupport.DEPOSIT;
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
          payload: RampRoutingType.DEPOSIT,
        }),
      );
    });

    it('routes to DEPOSIT when only completed order is from Transak', async () => {
      mockRampRegionSupport = RampRegionSupport.DEPOSIT;
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
          payload: RampRoutingType.DEPOSIT,
        }),
      );
    });

    it('routes to DEPOSIT when Transak is most recent among mixed states', async () => {
      mockRampRegionSupport = RampRegionSupport.DEPOSIT;
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
          payload: RampRoutingType.DEPOSIT,
        }),
      );
    });
  });

  describe('Provider-based routing without Transak', () => {
    it('routes to AGGREGATOR when last completed order is from Aggregator', async () => {
      mockRampRegionSupport = RampRegionSupport.DEPOSIT;
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
          payload: RampRoutingType.AGGREGATOR,
        }),
      );
    });

    it('routes to AGGREGATOR when last completed order is from MoonPay', async () => {
      mockRampRegionSupport = RampRegionSupport.DEPOSIT;
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
          payload: RampRoutingType.AGGREGATOR,
        }),
      );
    });

    it('routes to AGGREGATOR when last completed order is from Wyre', async () => {
      mockRampRegionSupport = RampRegionSupport.DEPOSIT;
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
          payload: RampRoutingType.AGGREGATOR,
        }),
      );
    });

    it('routes to AGGREGATOR when last completed order is from Deposit provider', async () => {
      mockRampRegionSupport = RampRegionSupport.DEPOSIT;
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
          payload: RampRoutingType.AGGREGATOR,
        }),
      );
    });
  });

  describe('Order sorting by timestamp', () => {
    it('uses most recent completed order when multiple completed orders exist', async () => {
      mockRampRegionSupport = RampRegionSupport.DEPOSIT;
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
          payload: RampRoutingType.AGGREGATOR,
        }),
      );
    });

    it('ignores pending orders when determining last completed order', async () => {
      mockRampRegionSupport = RampRegionSupport.DEPOSIT;
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
          payload: RampRoutingType.DEPOSIT,
        }),
      );
    });
  });

  describe('Hook lifecycle', () => {
    it('determines routing decision on mount', async () => {
      mockRampRegionSupport = RampRegionSupport.DEPOSIT;
      mockOrders = [];

      renderHook(() => useRampsSmartRouting());

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledTimes(1);
      });
    });

    it('updates routing decision when orders change', async () => {
      mockRampRegionSupport = RampRegionSupport.DEPOSIT;
      mockOrders = [];

      const { rerender } = renderHook(() => useRampsSmartRouting());

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'FIAT_SET_RAMP_ROUTING_DECISION',
          payload: RampRoutingType.DEPOSIT,
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
          payload: RampRoutingType.AGGREGATOR,
        });
      });
    });

    it('updates routing decision when region support changes', async () => {
      mockRampRegionSupport = RampRegionSupport.AGGREGATOR;
      mockOrders = [];

      const { rerender } = renderHook(() => useRampsSmartRouting());

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'FIAT_SET_RAMP_ROUTING_DECISION',
          payload: RampRoutingType.AGGREGATOR,
        });
      });

      mockDispatch.mockClear();
      mockRampRegionSupport = RampRegionSupport.DEPOSIT;

      rerender({});

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'FIAT_SET_RAMP_ROUTING_DECISION',
          payload: RampRoutingType.DEPOSIT,
        });
      });
    });
  });

  describe('Edge cases', () => {
    it('handles orders with same timestamp', async () => {
      mockRampRegionSupport = RampRegionSupport.DEPOSIT;
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
      mockRampRegionSupport = RampRegionSupport.DEPOSIT;
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
          payload: RampRoutingType.DEPOSIT,
        }),
      );
    });

    it('handles orders array with created state', async () => {
      mockRampRegionSupport = RampRegionSupport.DEPOSIT;
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
          payload: RampRoutingType.DEPOSIT,
        }),
      );
    });
  });
});
