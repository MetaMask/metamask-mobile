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
  resetPerpsCufTraceForTests,
} from '../utils/perpsCufTrace';
import {
  PERPS_CUF_STREAM_CONFIRM_RACE_MS,
  PERPS_CUF_STREAM_TIMEOUT_MS,
} from '../constants/perpsCufTags';
import { endTrace, TraceName } from '../../../../util/trace';

jest.mock('./usePerpsTrading');
jest.mock('../../../../util/trace', () => {
  const actual = jest.requireActual('../../../../util/trace');
  return {
    ...actual,
    trace: jest.fn(),
    endTrace: jest.fn(),
  };
});
const mockEndTrace = endTrace as jest.Mock;
const mockGetPositionsSnapshot = jest.fn();
const mockGetOrdersSnapshot = jest.fn();
const mockPositionsLastDeliveredAt = jest.fn(() => null as number | null);
const mockOrdersLastDeliveredAt = jest.fn(() => null as number | null);
jest.mock('../providers/PerpsStreamManager', () => ({
  usePerpsStream: () => ({
    positions: {
      getSnapshot: mockGetPositionsSnapshot,
      getLastDeliveredAt: mockPositionsLastDeliveredAt,
    },
    orders: {
      getSnapshot: mockGetOrdersSnapshot,
      getLastDeliveredAt: mockOrdersLastDeliveredAt,
    },
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
    // Clear the CUF singleton's pending map/place-order state so armed ops from
    // one test can't leak into the next (these tests drive the real module).
    resetPerpsCufTraceForTests();
    mockTrack.mockClear();
    mockEndTrace.mockClear();
    mockGetPositionsSnapshot.mockReturnValue([]); // Loaded, no positions by default
    mockGetOrdersSnapshot.mockReturnValue([]); // Loaded, no orders by default
    mockPositionsLastDeliveredAt.mockReturnValue(null);
    mockOrdersLastDeliveredAt.mockReturnValue(null);
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
    mockGetPositionsSnapshot.mockReturnValueOnce([]); // pre-order baseline: loaded, none
    mockGetPositionsSnapshot.mockReturnValue([mockPosition]);
    mockPlaceOrder.mockImplementation(async () => {
      handlePerpsCufPositionsDelivered([mockPosition]);
      return { success: true, orderId: 'order123', ...result };
    });
  };

  describe('limit orders (order-render CUF, not position-render)', () => {
    it('confirms immediately when the resting order is already rendered', async () => {
      const onSuccess = jest.fn();
      // Order already rendered by submit time: the span ends synchronously; the
      // gesture-anchored safety fallback stays pending and no-ops.
      mockGetOrdersSnapshot.mockReturnValue([{ orderId: 'lim1' }]);
      mockOrdersLastDeliveredAt.mockReturnValue(4242);
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

      // Limit orders capture a pre-submit position baseline so marketable
      // limits that fill before watcher registration are still detected.
      expect(onSuccess).toHaveBeenCalledWith();
      expect(mockGetPositionsSnapshot).toHaveBeenCalledTimes(1);
      // The already-rested order ends at its stream delivery instant, not now.
      expect(mockEndTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.stringContaining(
            TraceName.PerpsPlaceLimitOrderToOrderRendered,
          ),
          timestamp: 4242,
          data: expect.objectContaining({ success: true }),
        }),
      );
    });

    it('ends immediately when a marketable limit fill rendered before watcher registration', async () => {
      mockGetPositionsSnapshot
        .mockReturnValueOnce([]) // pre-submit baseline: loaded, no position
        .mockReturnValue([mockPosition]); // post-submit fill already rendered
      mockGetOrdersSnapshot.mockReturnValue([]);
      mockPositionsLastDeliveredAt.mockReturnValue(7777);
      mockPlaceOrder.mockImplementation(async () => {
        handlePerpsCufPositionsDelivered([mockPosition]);
        return { success: true, orderId: 'lim1' };
      });

      const { result } = renderHook(() => usePerpsOrderExecution());

      await act(async () => {
        await result.current.placeOrder({
          ...mockOrderParams,
          orderType: 'limit',
          price: '10000',
        });
      });

      // The already-rendered fill ends at the positions delivery instant.
      expect(mockEndTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.stringContaining(
            TraceName.PerpsPlaceLimitOrderToOrderRendered,
          ),
          timestamp: 7777,
          data: expect.objectContaining({ success: true }),
        }),
      );
    });

    it('ends as a success when a marketable limit fill fully closed the prior position', async () => {
      jest.useFakeTimers();
      try {
        mockGetPositionsSnapshot
          .mockReturnValueOnce([mockPosition]) // pre-submit baseline: a real hold
          .mockReturnValue([]); // fill closed it fully -> symbol now absent
        mockGetOrdersSnapshot.mockReturnValue([]); // filled, so no resting order
        mockPositionsLastDeliveredAt.mockReturnValue(9999);
        mockPlaceOrder.mockImplementation(async () => {
          handlePerpsCufPositionsDelivered([]);
          return { success: true, orderId: 'lim1' };
        });

        const { result } = renderHook(() => usePerpsOrderExecution());

        await act(async () => {
          await result.current.placeOrder({
            ...mockOrderParams,
            orderType: 'limit',
            price: '10000',
          });
        });

        // The close-fill is a synchronous render: ends at the delivery instant
        // as a success, not a stream_timeout via a watcher that missed it.
        expect(mockEndTrace).toHaveBeenCalledWith(
          expect.objectContaining({
            id: expect.stringContaining(
              TraceName.PerpsPlaceLimitOrderToOrderRendered,
            ),
            timestamp: 9999,
            data: expect.objectContaining({ success: true }),
          }),
        );
        // Draining the safety watchdog must not overturn it into a failure.
        act(() => {
          jest.runOnlyPendingTimers();
        });
        expect(mockEndTrace).not.toHaveBeenCalledWith(
          expect.objectContaining({
            id: expect.stringContaining(
              TraceName.PerpsPlaceLimitOrderToOrderRendered,
            ),
            data: expect.objectContaining({ success: false }),
          }),
        );
      } finally {
        jest.useRealTimers();
      }
    });

    it('does not end immediately when only TP/SL changed during limit submit', async () => {
      jest.useFakeTimers();
      try {
        mockGetPositionsSnapshot
          .mockReturnValueOnce([
            {
              ...mockPosition,
              takeProfitPrice: '70000',
            },
          ])
          .mockReturnValue([{ ...mockPosition, takeProfitPrice: '71000' }]);
        mockGetOrdersSnapshot.mockReturnValue([]);
        mockPlaceOrder.mockResolvedValue({ success: true, orderId: 'lim1' });

        const { result } = renderHook(() => usePerpsOrderExecution());

        await act(async () => {
          await result.current.placeOrder({
            ...mockOrderParams,
            orderType: 'limit',
            price: '10000',
          });
        });

        expect(mockEndTrace).not.toHaveBeenCalledWith(
          expect.objectContaining({
            id: expect.stringContaining(
              TraceName.PerpsPlaceLimitOrderToOrderRendered,
            ),
            data: expect.objectContaining({ success: true }),
          }),
        );

        act(() => {
          jest.runOnlyPendingTimers();
        });
      } finally {
        jest.useRealTimers();
      }
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

    it('ends the position-render span at the captured render instant, not when the hook resumes', async () => {
      mockPlaceOrderSuccessWithRender();

      const { result } = renderHook(() => usePerpsOrderExecution());

      await act(async () => {
        await result.current.placeOrder(mockOrderParams);
      });

      await waitFor(() => {
        expect(result.current.isPlacing).toBe(false);
      });

      // endTrace receives an explicit numeric timestamp (the stream render
      // instant) plus the toast->position delta, so the span measures
      // gesture -> actual render rather than gesture -> toast callback.
      expect(mockEndTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.stringContaining(
            TraceName.PerpsPlaceOrderToPositionRendered,
          ),
          timestamp: expect.any(Number),
          data: expect.objectContaining({
            success: true,
            toast_position_delta_ms: expect.any(Number),
          }),
        }),
      );
    });

    it('records a negative toast_position_delta_ms when the position renders before the toast', async () => {
      // Monotonic clock: the stream render instant is captured inside placeOrder
      // (before the await resolves) and the toast instant after it, so the
      // signed delta is negative — a positive value would mean the position
      // rendered AFTER the toast.
      let clock = 1_000_000;
      const nowSpy = jest.spyOn(Date, 'now').mockImplementation(() => {
        clock += 10;
        return clock;
      });
      try {
        mockPlaceOrderSuccessWithRender();

        const { result } = renderHook(() => usePerpsOrderExecution());

        await act(async () => {
          await result.current.placeOrder(mockOrderParams);
        });
        await waitFor(() => {
          expect(result.current.isPlacing).toBe(false);
        });

        const renderCall = mockEndTrace.mock.calls.find((c) =>
          String(c[0]?.id ?? '').includes(
            TraceName.PerpsPlaceOrderToPositionRendered,
          ),
        );
        expect(renderCall).toBeDefined();
        expect(renderCall?.[0]?.data?.toast_position_delta_ms).toBeLessThan(0);
      } finally {
        nowSpy.mockRestore();
      }
    });

    it('ends the span via the gesture fallback if the controller never returns', () => {
      jest.useFakeTimers();
      try {
        mockGetPositionsSnapshot.mockReturnValue([]);
        // Controller hangs: the promise never settles, so no per-flow end runs.
        mockPlaceOrder.mockImplementation(
          () => new Promise<never>(() => undefined),
        );

        const { result } = renderHook(() => usePerpsOrderExecution());

        act(() => {
          // Fire and forget: a hung controller means this never resolves.
          result.current.placeOrder(mockOrderParams).catch(() => undefined);
        });

        act(() => {
          jest.advanceTimersByTime(PERPS_CUF_STREAM_TIMEOUT_MS);
        });

        // The gesture-anchored fallback closes the span instead of leaking it,
        // tagged controller_timeout (hung request) not stream_timeout.
        expect(mockEndTrace).toHaveBeenCalledWith(
          expect.objectContaining({
            id: expect.stringContaining(
              TraceName.PerpsPlaceOrderToPositionRendered,
            ),
            data: expect.objectContaining({
              success: false,
              reason: 'controller_timeout',
            }),
          }),
        );
      } finally {
        jest.useRealTimers();
      }
    });

    it('does not let the hung-controller watchdog end after controller success while stream wait continues', async () => {
      jest.useFakeTimers();
      try {
        const onSuccess = jest.fn();
        mockPlaceOrder.mockResolvedValue({
          success: true,
          orderId: 'order123',
        });

        const { result } = renderHook(() =>
          usePerpsOrderExecution({ onSuccess }),
        );

        let placeOrderPromise: Promise<unknown>;
        await act(async () => {
          placeOrderPromise = result.current.placeOrder(mockOrderParams);
          await Promise.resolve();
        });

        await act(async () => {
          jest.advanceTimersByTime(PERPS_CUF_STREAM_CONFIRM_RACE_MS);
          await Promise.resolve();
        });
        await act(async () => {
          await placeOrderPromise;
        });
        expect(onSuccess).toHaveBeenCalledWith();
        mockEndTrace.mockClear();

        act(() => {
          jest.advanceTimersByTime(
            PERPS_CUF_STREAM_TIMEOUT_MS - PERPS_CUF_STREAM_CONFIRM_RACE_MS,
          );
        });

        expect(mockEndTrace).not.toHaveBeenCalled();

        await act(async () => {
          handlePerpsCufPositionsDelivered([mockPosition]);
          await Promise.resolve();
        });

        expect(mockEndTrace).toHaveBeenCalledWith(
          expect.objectContaining({
            id: expect.stringContaining(
              TraceName.PerpsPlaceOrderToPositionRendered,
            ),
            data: expect.objectContaining({ success: true }),
          }),
        );
      } finally {
        jest.useRealTimers();
      }
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
          chartLibrary: 'advanced',
        } as NonNullable<OrderParams['trackingData']> & {
          chartLibrary: string;
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
          [PERPS_EVENT_PROPERTY.CHART_LIBRARY]: 'advanced',
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

    it('does not close a pending market CUF when a later limit order fails', async () => {
      mockPlaceOrder.mockResolvedValue({
        success: false,
        error: 'Limit failed',
      });

      handlePerpsCufPositionsDelivered([mockPosition]);
      mockEndTrace.mockClear();

      const { result } = renderHook(() => usePerpsOrderExecution());

      await act(async () => {
        await result.current.placeOrder({
          ...mockOrderParams,
          orderType: 'limit',
          price: '10000',
        });
      });

      expect(mockEndTrace).not.toHaveBeenCalledWith(
        expect.objectContaining({
          name: TraceName.PerpsPlaceOrderToPositionRendered,
        }),
      );
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
          chartLibrary: 'advanced',
        } as NonNullable<OrderParams['trackingData']> & {
          chartLibrary: string;
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
          [PERPS_EVENT_PROPERTY.CHART_LIBRARY]: 'advanced',
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
          chartLibrary: 'advanced',
        } as NonNullable<OrderParams['trackingData']> & {
          chartLibrary: string;
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
          [PERPS_EVENT_PROPERTY.CHART_LIBRARY]: 'advanced',
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
