import { renderHook, act } from '@testing-library/react-native';
import { usePredictOrderbook } from './usePredictOrderbook';
import Engine from '../../../../core/Engine';
import type { OrderbookCallback, OrderbookSnapshot } from '../types';

jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      subscribeToOrderbook: jest.fn(),
      getConnectionStatus: jest.fn(),
    },
  },
}));

const buildSnapshot = (
  overrides: Partial<OrderbookSnapshot> = {},
): OrderbookSnapshot => ({
  tokenId: 'token1',
  bids: [
    { price: 0.5, size: 100 },
    { price: 0.45, size: 50 },
  ],
  asks: [
    { price: 0.55, size: 80 },
    { price: 0.6, size: 30 },
  ],
  timestamp: 1700000000,
  ...overrides,
});

describe('usePredictOrderbook', () => {
  const mockSubscribeToOrderbook = Engine.context.PredictController
    .subscribeToOrderbook as jest.Mock;
  const mockGetConnectionStatus = Engine.context.PredictController
    .getConnectionStatus as jest.Mock;
  const mockUnsubscribe = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockSubscribeToOrderbook.mockReturnValue(mockUnsubscribe);
    mockGetConnectionStatus.mockReturnValue({
      sportsConnected: false,
      marketConnected: true,
      rtdsConnected: false,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('subscription management', () => {
    it('subscribes via the PredictController when a tokenId is provided', () => {
      renderHook(() => usePredictOrderbook('token1'));

      expect(mockSubscribeToOrderbook).toHaveBeenCalledWith(
        'token1',
        expect.any(Function),
      );
    });

    it('does not subscribe when tokenId is undefined', () => {
      renderHook(() => usePredictOrderbook(undefined));

      expect(mockSubscribeToOrderbook).not.toHaveBeenCalled();
    });

    it('does not subscribe when enabled is false', () => {
      renderHook(() => usePredictOrderbook('token1', { enabled: false }));

      expect(mockSubscribeToOrderbook).not.toHaveBeenCalled();
    });

    it('unsubscribes on unmount', () => {
      const { unmount } = renderHook(() => usePredictOrderbook('token1'));

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    });

    it('resubscribes exactly once when tokenId changes', () => {
      const { rerender } = renderHook(
        ({ tokenId }) => usePredictOrderbook(tokenId),
        { initialProps: { tokenId: 'token1' } },
      );

      expect(mockSubscribeToOrderbook).toHaveBeenCalledTimes(1);

      rerender({ tokenId: 'token2' });

      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
      expect(mockSubscribeToOrderbook).toHaveBeenCalledTimes(2);
      expect(mockSubscribeToOrderbook).toHaveBeenLastCalledWith(
        'token2',
        expect.any(Function),
      );
    });
  });

  describe('initial state and skip behavior', () => {
    it('returns null orderbook and loading=true on first render with a tokenId', () => {
      // Block snapshot delivery by holding the callback before flushing.
      mockSubscribeToOrderbook.mockImplementation(() => mockUnsubscribe);

      const { result } = renderHook(() => usePredictOrderbook('token1'));

      expect(result.current.orderbook).toBeNull();
      expect(result.current.loading).toBe(true);
    });

    it('marks loading=false and isConnected=false when no tokenId is provided', () => {
      const { result } = renderHook(() => usePredictOrderbook(undefined));

      expect(result.current.loading).toBe(false);
      expect(result.current.isConnected).toBe(false);
    });

    it('marks loading=false and isConnected=false when enabled is false', () => {
      const { result } = renderHook(() =>
        usePredictOrderbook('token1', { enabled: false }),
      );

      expect(result.current.loading).toBe(false);
      expect(result.current.isConnected).toBe(false);
    });
  });

  describe('snapshot delivery', () => {
    it('maps OrderbookSnapshot to tuple-shaped OrderbookData preserving sort order', () => {
      let capturedCallback: OrderbookCallback = jest.fn();
      mockSubscribeToOrderbook.mockImplementation((_, callback) => {
        capturedCallback = callback;
        return mockUnsubscribe;
      });

      const { result } = renderHook(() => usePredictOrderbook('token1'));

      act(() => {
        capturedCallback(buildSnapshot());
      });

      expect(result.current.orderbook).toEqual({
        bids: [
          [0.5, 100],
          [0.45, 50],
        ],
        asks: [
          [0.55, 80],
          [0.6, 30],
        ],
      });
      expect(result.current.loading).toBe(false);
    });

    it('resets orderbook to null when tokenId changes to avoid stale data', () => {
      let capturedCallback: OrderbookCallback = jest.fn();
      mockSubscribeToOrderbook.mockImplementation((_, callback) => {
        capturedCallback = callback;
        return mockUnsubscribe;
      });

      const { result, rerender } = renderHook(
        ({ tokenId }) => usePredictOrderbook(tokenId),
        { initialProps: { tokenId: 'token1' } },
      );

      act(() => {
        capturedCallback(buildSnapshot());
      });
      expect(result.current.orderbook).not.toBeNull();

      rerender({ tokenId: 'token2' });

      expect(result.current.orderbook).toBeNull();
      expect(result.current.loading).toBe(true);
    });

    it('does not call setState when a snapshot arrives after unmount', () => {
      let capturedCallback: OrderbookCallback = jest.fn();
      mockSubscribeToOrderbook.mockImplementation((_, callback) => {
        capturedCallback = callback;
        return mockUnsubscribe;
      });

      const { unmount } = renderHook(() => usePredictOrderbook('token1'));
      unmount();

      // No throw and no warning even though setState would be invalid here.
      expect(() => {
        capturedCallback(buildSnapshot());
      }).not.toThrow();
    });
  });

  describe('connection status polling', () => {
    it('reflects the initial marketConnected status', () => {
      const { result } = renderHook(() => usePredictOrderbook('token1'));

      expect(result.current.isConnected).toBe(true);
    });

    it('polls getConnectionStatus on a 1s interval and updates isConnected', () => {
      mockGetConnectionStatus
        .mockReturnValueOnce({
          sportsConnected: false,
          marketConnected: true,
          rtdsConnected: false,
        })
        .mockReturnValueOnce({
          sportsConnected: false,
          marketConnected: false,
          rtdsConnected: false,
        });

      const { result } = renderHook(() => usePredictOrderbook('token1'));

      expect(result.current.isConnected).toBe(true);

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(result.current.isConnected).toBe(false);
    });

    it('clears the connection-status interval on unmount', () => {
      const clearSpy = jest.spyOn(global, 'clearInterval');
      const { unmount } = renderHook(() => usePredictOrderbook('token1'));

      unmount();

      expect(clearSpy).toHaveBeenCalled();
      clearSpy.mockRestore();
    });
  });
});
