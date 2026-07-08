import { renderHook, act, waitFor } from '@testing-library/react-native';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
  type OrderParams,
  type Position,
} from '@metamask/perps-controller';
import { usePerpsOrderExecution } from './usePerpsOrderExecution';
import { usePerpsTrading } from './usePerpsTrading';
import {
  handlePerpsCufPositionsDelivered,
  handlePerpsCufOrdersDelivered,
} from '../utils/perpsCufTrace';

jest.mock('./usePerpsTrading');
const mockGetPositionsSnapshot = jest.fn();
const mockGetOrdersSnapshot = jest.fn();
jest.mock('../providers/PerpsStreamManager', () => ({
  usePerpsStream: () => ({
    positions: { getSnapshot: mockGetPositionsSnapshot },
    orders: { getSnapshot: mockGetOrdersSnapshot },
  }),
}));
const mockTrack = jest.fn();
jest.mock('./usePerpsEventTracking', () => ({
  usePerpsEventTracking: () => ({ track: mockTrack }),
}));
jest.mock('./usePerpsMeasurement', () => ({
  usePerpsMeasurement: jest.fn(),
}));
jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'perps.order.error.unknown': 'Unknown error',
    };
    return translations[key] || key;
  }),
}));

// Mock DevLogger
jest.mock('../../../../core/SDKConnect/utils/DevLogger', () => ({
  __esModule: true,
  default: {
    log: jest.fn(),
  },
}));

describe('usePerpsOrderExecution', () => {
  const mockPlaceOrder = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockTrack.mockClear();
    mockGetPositionsSnapshot.mockReturnValue(null); // No cached positions by default
    mockGetOrdersSnapshot.mockReturnValue(null); // No cached orders by default
    (usePerpsTrading as jest.Mock).mockReturnValue({
      placeOrder: mockPlaceOrder,
    });
  });

  const mockOrderParams: OrderParams = {
    symbol: 'BTC',
    isBuy: true,
    size: '0.1',
    orderType: 'market',
    leverage: 10,
  };

  const mockPosition: Position = {
    symbol: 'BTC',
    size: '0.1',
    entryPrice: '50000',
    positionValue: '5000',
    unrealizedPnl: '0',
    returnOnEquity: '0',
    leverage: {
      type: 'cross',
      value: 10,
      rawUsd: '500',
    },
    liquidationPrice: '45000',
    marginUsed: '500',
    maxLeverage: 50,
    cumulativeFunding: {
      allTime: '0',
      sinceOpen: '0',
      sinceChange: '0',
    },
    takeProfitCount: 0,
    stopLossCount: 0,
  };

  /**
   * Order succeeds and the position stream renders it: the stream delivery
   * happens inside placeOrder (after the CUF is armed), and the post-render
   * snapshot contains the position.
   */
  const mockPlaceOrderSuccessWithRender = (
    result: Record<string, unknown> = {},
  ) => {
    mockGetPositionsSnapshot.mockReturnValueOnce(null); // pre-order baseline: none
    mockGetPositionsSnapshot.mockReturnValue([mockPosition]);
    mockPlaceOrder.mockImplementation(async () => {
      handlePerpsCufPositionsDelivered([mockPosition]);
      return { success: true, orderId: 'order123', ...result };
    });
  };

  describe('limit orders (order-render CUF, not position-render)', () => {
    it('confirms immediately and never touches the position matcher', async () => {
      const onSuccess = jest.fn();
      // Order already rendered by submit time: span ends synchronously, no
      // fallback timer is scheduled.
      mockGetOrdersSnapshot.mockReturnValue([{ orderId: 'lim1' }]);
      mockPlaceOrder.mockResolvedValue({ success: true, orderId: 'lim1' });

      const { result } = renderHook(() =>
        usePerpsOrderExecution({ onSuccess }),
      );

      await act(async () => {
        await result.current.placeOrder({
          ...mockOrderParams,
          orderType: 'limit',
          price: '10000',
        });
      });

      await waitFor(() => {
        expect(result.current.isPlacing).toBe(false);
      });

      // Resting limit orders confirm on API success; the position baseline
      // snapshot is never read because the position-render CUF is not armed.
      expect(onSuccess).toHaveBeenCalledWith();
      expect(mockGetPositionsSnapshot).not.toHaveBeenCalled();
    });

    it('ends the order-render span when the resting order renders in the stream', async () => {
      jest.useFakeTimers();
      try {
        mockGetOrdersSnapshot.mockReturnValue([]); // not rendered synchronously
        mockPlaceOrder.mockResolvedValue({ success: true, orderId: 'lim1' });

        const { result } = renderHook(() => usePerpsOrderExecution());

        await act(async () => {
          await result.current.placeOrder({
            ...mockOrderParams,
            orderType: 'limit',
            price: '10000',
          });
        });

        // Stream renders the resting order -> span ends at the boundary
        // (before the 30s fallback would fire).
        act(() => {
          handlePerpsCufOrdersDelivered([{ orderId: 'lim1' }]);
        });

        // Flush the scheduled fallback so no timer leaks past the test.
        act(() => {
          jest.runOnlyPendingTimers();
        });
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe('successful order placement', () => {
    it('calls onSuccess with the position once the stream renders it', async () => {
      const onSuccess = jest.fn();
      const onError = jest.fn();

      mockPlaceOrderSuccessWithRender();

      const { result } = renderHook(() =>
        usePerpsOrderExecution({ onSuccess, onError }),
      );

      await act(async () => {
        await result.current.placeOrder(mockOrderParams);
      });

      await waitFor(() => {
        expect(result.current.isPlacing).toBe(false);
      });

      expect(mockPlaceOrder).toHaveBeenCalledWith(mockOrderParams);
      expect(onSuccess).toHaveBeenCalledWith(mockPosition);
      expect(onError).not.toHaveBeenCalled();
      expect(result.current.lastResult).toEqual({
        success: true,
        orderId: 'order123',
      });
      expect(result.current.error).toBeUndefined();
    });

    it('calls onSuccess with no args when the stream has not rendered the position yet', async () => {
      const onSuccess = jest.fn();

      mockPlaceOrder.mockResolvedValue({
        success: true,
        orderId: 'order123',
      });
      // No stream delivery: the confirm race times out and toasts without it.

      const { result } = renderHook(() =>
        usePerpsOrderExecution({ onSuccess }),
      );

      await act(async () => {
        await result.current.placeOrder(mockOrderParams);
      });

      await waitFor(() => {
        expect(result.current.isPlacing).toBe(false);
      });

      expect(onSuccess).toHaveBeenCalledWith();

      // Deliver the late render so the pending stream waiter (and its
      // timeout) resolves instead of leaking past the test.
      act(() => {
        handlePerpsCufPositionsDelivered([mockPosition]);
      });
    });

    it('tracks partially filled event with trackingData when filledSize is between 0 and order size', async () => {
      const onSuccess = jest.fn();
      const paramsWithTracking: OrderParams = {
        ...mockOrderParams,
        size: '0.2',
        trackingData: {
          totalFee: 0,
          marketPrice: 50000,
          tradeWithToken: true,
          mmPayTokenSelected: 'USDC',
          mmPayNetworkSelected: 'ethereum',
        },
      };

      mockPlaceOrderSuccessWithRender({ filledSize: '0.1' });

      const { result } = renderHook(() =>
        usePerpsOrderExecution({ onSuccess, onError: jest.fn() }),
      );

      await act(async () => {
        await result.current.placeOrder(paramsWithTracking);
      });

      await waitFor(() => {
        expect(result.current.isPlacing).toBe(false);
      });

      expect(mockTrack).toHaveBeenCalledWith(
        MetaMetricsEvents.PERPS_TRADE_TRANSACTION,
        expect.objectContaining({
          [PERPS_EVENT_PROPERTY.STATUS]:
            PERPS_EVENT_VALUE.STATUS.PARTIALLY_FILLED,
          [PERPS_EVENT_PROPERTY.TRADE_WITH_TOKEN]: true,
          [PERPS_EVENT_PROPERTY.MM_PAY_TOKEN_SELECTED]: 'USDC',
          [PERPS_EVENT_PROPERTY.MM_PAY_NETWORK_SELECTED]: 'ethereum',
        }),
      );
    });

    it('tracks success with mm_pay_token_selected Perps Balance when trackingData has tradeWithToken false', async () => {
      const onSuccess = jest.fn();
      const paramsWithPerpsBalance: OrderParams = {
        ...mockOrderParams,
        size: '0.2',
        trackingData: {
          totalFee: 0,
          marketPrice: 50000,
          tradeWithToken: false,
        },
      };

      mockPlaceOrderSuccessWithRender({ filledSize: '0.1' });

      const { result } = renderHook(() =>
        usePerpsOrderExecution({ onSuccess, onError: jest.fn() }),
      );

      await act(async () => {
        await result.current.placeOrder(paramsWithPerpsBalance);
      });

      await waitFor(() => {
        expect(result.current.isPlacing).toBe(false);
      });

      expect(mockTrack).toHaveBeenCalledWith(
        MetaMetricsEvents.PERPS_TRADE_TRANSACTION,
        expect.objectContaining({
          [PERPS_EVENT_PROPERTY.TRADE_WITH_TOKEN]: false,
          [PERPS_EVENT_PROPERTY.MM_PAY_TOKEN_SELECTED]:
            PERPS_EVENT_VALUE.MM_PAY_TOKEN.PERPS_BALANCE,
        }),
      );
    });
  });

  describe('failed order placement', () => {
    it('calls onError with message and sets error when order returns success false with error', async () => {
      const onSuccess = jest.fn();
      const onError = jest.fn();

      mockPlaceOrder.mockResolvedValue({
        success: false,
        error: 'Insufficient margin',
      });

      const { result } = renderHook(() =>
        usePerpsOrderExecution({ onSuccess, onError }),
      );

      await act(async () => {
        await result.current.placeOrder(mockOrderParams);
      });

      await waitFor(() => {
        expect(result.current.isPlacing).toBe(false);
      });

      expect(onError).toHaveBeenCalledWith('Insufficient margin');
      expect(onSuccess).not.toHaveBeenCalled();
      expect(result.current.error).toBe('Insufficient margin');
      expect(result.current.lastResult).toEqual({
        success: false,
        error: 'Insufficient margin',
      });
    });

    it('tracks failed order with trade_with_token and mm_pay fields when trackingData is set', async () => {
      const onError = jest.fn();
      const paramsWithTracking: OrderParams = {
        ...mockOrderParams,
        trackingData: {
          totalFee: 0,
          marketPrice: 50000,
          tradeWithToken: true,
          mmPayTokenSelected: 'USDC',
          mmPayNetworkSelected: 'ethereum',
        },
      };

      mockPlaceOrder.mockResolvedValue({
        success: false,
        error: 'Insufficient margin',
      });

      const { result } = renderHook(() => usePerpsOrderExecution({ onError }));

      await act(async () => {
        await result.current.placeOrder(paramsWithTracking);
      });

      await waitFor(() => {
        expect(result.current.isPlacing).toBe(false);
      });

      expect(mockTrack).toHaveBeenCalledWith(
        MetaMetricsEvents.PERPS_TRADE_TRANSACTION,
        expect.objectContaining({
          [PERPS_EVENT_PROPERTY.STATUS]: PERPS_EVENT_VALUE.STATUS.FAILED,
          [PERPS_EVENT_PROPERTY.TRADE_WITH_TOKEN]: true,
          [PERPS_EVENT_PROPERTY.MM_PAY_TOKEN_SELECTED]: 'USDC',
          [PERPS_EVENT_PROPERTY.MM_PAY_NETWORK_SELECTED]: 'ethereum',
        }),
      );
    });

    it('tracks failed order with mm_pay_token_selected Perps Balance when trackingData has tradeWithToken false', async () => {
      const onError = jest.fn();
      const paramsWithPerpsBalance: OrderParams = {
        ...mockOrderParams,
        trackingData: {
          totalFee: 0,
          marketPrice: 50000,
          tradeWithToken: false,
        },
      };

      mockPlaceOrder.mockResolvedValue({
        success: false,
        error: 'Insufficient margin',
      });

      const { result } = renderHook(() => usePerpsOrderExecution({ onError }));

      await act(async () => {
        await result.current.placeOrder(paramsWithPerpsBalance);
      });

      await waitFor(() => {
        expect(result.current.isPlacing).toBe(false);
      });

      expect(mockTrack).toHaveBeenCalledWith(
        MetaMetricsEvents.PERPS_TRADE_TRANSACTION,
        expect.objectContaining({
          [PERPS_EVENT_PROPERTY.STATUS]: PERPS_EVENT_VALUE.STATUS.FAILED,
          [PERPS_EVENT_PROPERTY.TRADE_WITH_TOKEN]: false,
          [PERPS_EVENT_PROPERTY.MM_PAY_TOKEN_SELECTED]:
            PERPS_EVENT_VALUE.MM_PAY_TOKEN.PERPS_BALANCE,
        }),
      );
    });

    it('calls onError with unknown error when order returns success false without error', async () => {
      const onError = jest.fn();

      mockPlaceOrder.mockResolvedValue({
        success: false,
      });

      const { result } = renderHook(() => usePerpsOrderExecution({ onError }));

      await act(async () => {
        await result.current.placeOrder(mockOrderParams);
      });

      await waitFor(() => {
        expect(result.current.isPlacing).toBe(false);
      });

      expect(onError).toHaveBeenCalledWith('Unknown error');
      expect(result.current.error).toBe('Unknown error');
    });

    it('calls onError with exception message when placeOrder rejects', async () => {
      const onError = jest.fn();

      mockPlaceOrder.mockRejectedValue(new Error('Network timeout'));

      const { result } = renderHook(() => usePerpsOrderExecution({ onError }));

      await act(async () => {
        await result.current.placeOrder(mockOrderParams);
      });

      await waitFor(() => {
        expect(result.current.isPlacing).toBe(false);
      });

      expect(onError).toHaveBeenCalledWith('Network timeout');
      expect(result.current.error).toBe('Network timeout');
    });

    it('tracks exception with trade_with_token and mm_pay fields when placeOrder rejects and trackingData is set', async () => {
      const onError = jest.fn();
      const paramsWithTracking: OrderParams = {
        ...mockOrderParams,
        trackingData: {
          totalFee: 0,
          marketPrice: 50000,
          tradeWithToken: true,
          mmPayTokenSelected: 'USDC',
          mmPayNetworkSelected: 'ethereum',
        },
      };

      mockPlaceOrder.mockRejectedValue(new Error('Network timeout'));

      const { result } = renderHook(() => usePerpsOrderExecution({ onError }));

      await act(async () => {
        await result.current.placeOrder(paramsWithTracking);
      });

      await waitFor(() => {
        expect(result.current.isPlacing).toBe(false);
      });

      expect(mockTrack).toHaveBeenCalledWith(
        MetaMetricsEvents.PERPS_TRADE_TRANSACTION,
        expect.objectContaining({
          [PERPS_EVENT_PROPERTY.STATUS]: PERPS_EVENT_VALUE.STATUS.FAILED,
          [PERPS_EVENT_PROPERTY.TRADE_WITH_TOKEN]: true,
          [PERPS_EVENT_PROPERTY.MM_PAY_TOKEN_SELECTED]: 'USDC',
          [PERPS_EVENT_PROPERTY.MM_PAY_NETWORK_SELECTED]: 'ethereum',
        }),
      );
    });

    it('tracks exception with mm_pay_token_selected Perps Balance when placeOrder rejects and trackingData has tradeWithToken false', async () => {
      const onError = jest.fn();
      const paramsWithPerpsBalance: OrderParams = {
        ...mockOrderParams,
        trackingData: {
          totalFee: 0,
          marketPrice: 50000,
          tradeWithToken: false,
        },
      };

      mockPlaceOrder.mockRejectedValue(new Error('Network timeout'));

      const { result } = renderHook(() => usePerpsOrderExecution({ onError }));

      await act(async () => {
        await result.current.placeOrder(paramsWithPerpsBalance);
      });

      await waitFor(() => {
        expect(result.current.isPlacing).toBe(false);
      });

      expect(mockTrack).toHaveBeenCalledWith(
        MetaMetricsEvents.PERPS_TRADE_TRANSACTION,
        expect.objectContaining({
          [PERPS_EVENT_PROPERTY.STATUS]: PERPS_EVENT_VALUE.STATUS.FAILED,
          [PERPS_EVENT_PROPERTY.TRADE_WITH_TOKEN]: false,
          [PERPS_EVENT_PROPERTY.MM_PAY_TOKEN_SELECTED]:
            PERPS_EVENT_VALUE.MM_PAY_TOKEN.PERPS_BALANCE,
        }),
      );
    });
  });

  describe('error state management', () => {
    it('clears error when a subsequent order placement succeeds', async () => {
      mockPlaceOrder
        .mockResolvedValueOnce({ success: false, error: 'First error' })
        .mockImplementation(async () => {
          handlePerpsCufPositionsDelivered([mockPosition]);
          return { success: true };
        });

      const { result } = renderHook(() => usePerpsOrderExecution());

      // First order fails
      await act(async () => {
        await result.current.placeOrder(mockOrderParams);
      });

      expect(result.current.error).toBe('First error');

      // Second order succeeds
      await act(async () => {
        await result.current.placeOrder(mockOrderParams);
      });

      await waitFor(() => {
        expect(result.current.error).toBeUndefined();
      });
    });
  });

  describe('without callbacks', () => {
    it('updates lastResult when placeOrder succeeds and no onSuccess provided', async () => {
      mockPlaceOrderSuccessWithRender();

      const { result } = renderHook(() => usePerpsOrderExecution());

      await act(async () => {
        await result.current.placeOrder(mockOrderParams);
      });

      await waitFor(() => {
        expect(result.current.isPlacing).toBe(false);
      });

      expect(result.current.lastResult?.success).toBe(true);
    });

    it('sets error when order fails and no onError provided', async () => {
      mockPlaceOrder.mockResolvedValue({
        success: false,
        error: 'Order failed',
      });

      const { result } = renderHook(() => usePerpsOrderExecution());

      await act(async () => {
        await result.current.placeOrder(mockOrderParams);
      });

      await waitFor(() => {
        expect(result.current.isPlacing).toBe(false);
      });

      expect(result.current.error).toBe('Order failed');
    });
  });
});
