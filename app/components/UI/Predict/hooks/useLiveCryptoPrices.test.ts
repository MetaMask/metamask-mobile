import { renderHook, act } from '@testing-library/react-native';
import { useLiveCryptoPrices } from './useLiveCryptoPrices';
import Engine from '../../../../core/Engine';
import { CryptoPriceUpdate } from '../types';

jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      subscribeToCryptoPrices: jest.fn(),
      getConnectionStatus: jest.fn(),
    },
  },
}));

describe('useLiveCryptoPrices', () => {
  const mockSubscribeToCryptoPrices = Engine.context.PredictController
    .subscribeToCryptoPrices as jest.Mock;
  const mockGetConnectionStatus = Engine.context.PredictController
    .getConnectionStatus as jest.Mock;
  const mockUnsubscribe = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockSubscribeToCryptoPrices.mockReturnValue(mockUnsubscribe);
    mockGetConnectionStatus.mockReturnValue({
      rtdsConnected: true,
      sportsConnected: false,
      marketConnected: false,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('subscription management', () => {
    it('subscribes to crypto price updates when symbols are provided', () => {
      renderHook(() => useLiveCryptoPrices(['btcusdt', 'ethusdt']));

      expect(mockSubscribeToCryptoPrices).toHaveBeenCalledWith(
        ['btcusdt', 'ethusdt'],
        expect.any(Function),
      );
    });

    it('does not subscribe when symbols is empty', () => {
      renderHook(() => useLiveCryptoPrices([]));

      expect(mockSubscribeToCryptoPrices).not.toHaveBeenCalled();
    });

    it('does not subscribe when enabled is false', () => {
      renderHook(() =>
        useLiveCryptoPrices(['btcusdt', 'ethusdt'], { enabled: false }),
      );

      expect(mockSubscribeToCryptoPrices).not.toHaveBeenCalled();
    });

    it('unsubscribes on unmount', () => {
      const { unmount } = renderHook(() =>
        useLiveCryptoPrices(['btcusdt', 'ethusdt']),
      );

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('resubscribes when symbols change', () => {
      const { rerender } = renderHook(
        ({ symbols }) => useLiveCryptoPrices(symbols),
        { initialProps: { symbols: ['btcusdt'] } },
      );

      expect(mockSubscribeToCryptoPrices).toHaveBeenCalledTimes(1);

      rerender({ symbols: ['btcusdt', 'ethusdt'] });

      expect(mockUnsubscribe).toHaveBeenCalled();
      expect(mockSubscribeToCryptoPrices).toHaveBeenCalledTimes(2);
    });

    it('does not resubscribe when symbols order changes but content is same', () => {
      const { rerender } = renderHook(
        ({ symbols }) => useLiveCryptoPrices(symbols),
        { initialProps: { symbols: ['ethusdt', 'btcusdt'] } },
      );

      expect(mockSubscribeToCryptoPrices).toHaveBeenCalledTimes(1);

      rerender({ symbols: ['btcusdt', 'ethusdt'] });

      expect(mockSubscribeToCryptoPrices).toHaveBeenCalledTimes(1);
    });
  });

  describe('price update handling', () => {
    it('updates prices map when callback is invoked', () => {
      let capturedCallback: (update: CryptoPriceUpdate) => void = jest.fn();
      mockSubscribeToCryptoPrices.mockImplementation((_, callback) => {
        capturedCallback = callback;
        return mockUnsubscribe;
      });

      const { result } = renderHook(() => useLiveCryptoPrices(['btcusdt']));

      expect(result.current.prices.size).toBe(0);

      act(() => {
        capturedCallback({
          symbol: 'btcusdt',
          price: 67234.5,
          timestamp: 1700000000,
        });
      });

      expect(result.current.prices.get('btcusdt')).toEqual({
        symbol: 'btcusdt',
        price: 67234.5,
        timestamp: 1700000000,
      });
    });

    it('accumulates prices from multiple updates', () => {
      let capturedCallback: (update: CryptoPriceUpdate) => void = jest.fn();
      mockSubscribeToCryptoPrices.mockImplementation((_, callback) => {
        capturedCallback = callback;
        return mockUnsubscribe;
      });

      const { result } = renderHook(() =>
        useLiveCryptoPrices(['btcusdt', 'ethusdt']),
      );

      act(() => {
        capturedCallback({
          symbol: 'btcusdt',
          price: 67234.5,
          timestamp: 1700000000,
        });
      });

      act(() => {
        capturedCallback({
          symbol: 'ethusdt',
          price: 3500.0,
          timestamp: 1700000001,
        });
      });

      expect(result.current.prices.size).toBe(2);
      expect(result.current.prices.get('btcusdt')?.price).toBe(67234.5);
      expect(result.current.prices.get('ethusdt')?.price).toBe(3500.0);
    });

    it('overwrites previous price for same symbol', () => {
      let capturedCallback: (update: CryptoPriceUpdate) => void = jest.fn();
      mockSubscribeToCryptoPrices.mockImplementation((_, callback) => {
        capturedCallback = callback;
        return mockUnsubscribe;
      });

      const { result } = renderHook(() => useLiveCryptoPrices(['btcusdt']));

      act(() => {
        capturedCallback({
          symbol: 'btcusdt',
          price: 67234.5,
          timestamp: 1700000000,
        });
      });

      act(() => {
        capturedCallback({
          symbol: 'btcusdt',
          price: 68000.0,
          timestamp: 1700000005,
        });
      });

      expect(result.current.prices.get('btcusdt')?.price).toBe(68000.0);
    });

    it('updates lastUpdateTime when price update is received', () => {
      let capturedCallback: (update: CryptoPriceUpdate) => void = jest.fn();
      mockSubscribeToCryptoPrices.mockImplementation((_, callback) => {
        capturedCallback = callback;
        return mockUnsubscribe;
      });

      const mockNow = 1704067200000;
      jest.spyOn(Date, 'now').mockReturnValue(mockNow);

      const { result } = renderHook(() => useLiveCryptoPrices(['btcusdt']));

      expect(result.current.lastUpdateTime).toBeNull();

      act(() => {
        capturedCallback({
          symbol: 'btcusdt',
          price: 67234.5,
          timestamp: 1700000000,
        });
      });

      expect(result.current.lastUpdateTime).toBe(mockNow);
    });
  });

  describe('getPrice helper', () => {
    it('returns price for existing symbol', () => {
      let capturedCallback: (update: CryptoPriceUpdate) => void = jest.fn();
      mockSubscribeToCryptoPrices.mockImplementation((_, callback) => {
        capturedCallback = callback;
        return mockUnsubscribe;
      });

      const { result } = renderHook(() => useLiveCryptoPrices(['btcusdt']));

      act(() => {
        capturedCallback({
          symbol: 'btcusdt',
          price: 67234.5,
          timestamp: 1700000000,
        });
      });

      expect(result.current.getPrice('btcusdt')?.price).toBe(67234.5);
    });

    it('returns undefined for non-existent symbol', () => {
      const { result } = renderHook(() => useLiveCryptoPrices(['btcusdt']));

      expect(result.current.getPrice('ethusdt')).toBeUndefined();
    });
  });

  describe('connection status', () => {
    it('reflects connected status from PredictController', () => {
      mockGetConnectionStatus.mockReturnValue({
        rtdsConnected: true,
        sportsConnected: false,
        marketConnected: false,
      });

      const { result } = renderHook(() => useLiveCryptoPrices(['btcusdt']));

      expect(result.current.isConnected).toBe(true);
    });

    it('reflects disconnected status from PredictController', () => {
      mockGetConnectionStatus.mockReturnValue({
        rtdsConnected: false,
        sportsConnected: false,
        marketConnected: false,
      });

      const { result } = renderHook(() => useLiveCryptoPrices(['btcusdt']));

      expect(result.current.isConnected).toBe(false);
    });

    it('updates connection status on interval', () => {
      mockGetConnectionStatus
        .mockReturnValueOnce({
          rtdsConnected: true,
          sportsConnected: false,
          marketConnected: false,
        })
        .mockReturnValueOnce({
          rtdsConnected: false,
          sportsConnected: false,
          marketConnected: false,
        });

      const { result } = renderHook(() => useLiveCryptoPrices(['btcusdt']));

      expect(result.current.isConnected).toBe(true);

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(result.current.isConnected).toBe(false);
    });
  });

  describe('initial state', () => {
    it('returns empty prices map initially', () => {
      const { result } = renderHook(() => useLiveCryptoPrices(['btcusdt']));

      expect(result.current.prices.size).toBe(0);
    });

    it('returns null lastUpdateTime initially', () => {
      const { result } = renderHook(() => useLiveCryptoPrices(['btcusdt']));

      expect(result.current.lastUpdateTime).toBeNull();
    });

    it('resets state when disabled', () => {
      let capturedCallback: (update: CryptoPriceUpdate) => void = jest.fn();
      mockSubscribeToCryptoPrices.mockImplementation((_, callback) => {
        capturedCallback = callback;
        return mockUnsubscribe;
      });

      const { result, rerender } = renderHook(
        ({ enabled }) => useLiveCryptoPrices(['btcusdt'], { enabled }),
        { initialProps: { enabled: true } },
      );

      act(() => {
        capturedCallback({
          symbol: 'btcusdt',
          price: 67234.5,
          timestamp: 1700000000,
        });
      });

      expect(result.current.prices.size).toBe(1);

      rerender({ enabled: false });

      expect(result.current.prices.size).toBe(0);
      expect(result.current.isConnected).toBe(false);
    });

    it('resets lastUpdateTime when symbols change to different valid value', () => {
      let capturedCallback: (update: CryptoPriceUpdate) => void = jest.fn();
      mockSubscribeToCryptoPrices.mockImplementation((_, callback) => {
        capturedCallback = callback;
        return mockUnsubscribe;
      });

      const mockNow = 1704067200000;
      jest.spyOn(Date, 'now').mockReturnValue(mockNow);

      const { result, rerender } = renderHook(
        ({ symbols }) => useLiveCryptoPrices(symbols),
        { initialProps: { symbols: ['btcusdt'] } },
      );

      act(() => {
        capturedCallback({
          symbol: 'btcusdt',
          price: 67234.5,
          timestamp: 1700000000,
        });
      });

      expect(result.current.lastUpdateTime).toBe(mockNow);

      rerender({ symbols: ['ethusdt'] });

      expect(result.current.lastUpdateTime).toBeNull();
      expect(result.current.prices.size).toBe(0);
    });

    it('differentiates symbols with commas that could otherwise collide', () => {
      const { rerender } = renderHook(
        ({ symbols }) => useLiveCryptoPrices(symbols),
        { initialProps: { symbols: ['a,b', 'c'] } },
      );

      expect(mockSubscribeToCryptoPrices).toHaveBeenCalledTimes(1);

      rerender({ symbols: ['a', 'b,c'] });

      expect(mockSubscribeToCryptoPrices).toHaveBeenCalledTimes(2);
    });
  });
});
