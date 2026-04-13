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
    it('subscribes to PredictController when symbol is provided', () => {
      const onUpdate = jest.fn();

      renderHook(() => useLiveCryptoPrices('btcusdt', onUpdate));

      expect(mockSubscribeToCryptoPrices).toHaveBeenCalledWith(
        ['btcusdt'],
        expect.any(Function),
      );
    });

    it('does not subscribe when symbol is empty string', () => {
      const onUpdate = jest.fn();

      renderHook(() => useLiveCryptoPrices('', onUpdate));

      expect(mockSubscribeToCryptoPrices).not.toHaveBeenCalled();
    });

    it('unsubscribes on unmount', () => {
      const onUpdate = jest.fn();
      const { unmount } = renderHook(() =>
        useLiveCryptoPrices('btcusdt', onUpdate),
      );

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('resubscribes when symbol changes', () => {
      const onUpdate = jest.fn();
      const { rerender } = renderHook(
        ({ symbol }) => useLiveCryptoPrices(symbol, onUpdate),
        { initialProps: { symbol: 'btcusdt' } },
      );

      expect(mockSubscribeToCryptoPrices).toHaveBeenCalledTimes(1);

      rerender({ symbol: 'ethusdt' });

      expect(mockUnsubscribe).toHaveBeenCalled();
      expect(mockSubscribeToCryptoPrices).toHaveBeenCalledTimes(2);
    });
  });

  describe('price update handling', () => {
    it('forwards price updates to onUpdate callback', () => {
      let capturedCallback: (update: CryptoPriceUpdate) => void = jest.fn();
      mockSubscribeToCryptoPrices.mockImplementation((_, callback) => {
        capturedCallback = callback;
        return mockUnsubscribe;
      });

      const onUpdate = jest.fn();
      renderHook(() => useLiveCryptoPrices('btcusdt', onUpdate));

      const update: CryptoPriceUpdate = {
        symbol: 'btcusdt',
        price: 67234.5,
        timestamp: 1700000000,
      };

      act(() => {
        capturedCallback(update);
      });

      expect(onUpdate).toHaveBeenCalledWith(update);
    });

    it('does not call onUpdate after unmount', () => {
      let capturedCallback: (update: CryptoPriceUpdate) => void = jest.fn();
      mockSubscribeToCryptoPrices.mockImplementation((_, callback) => {
        capturedCallback = callback;
        return mockUnsubscribe;
      });

      const onUpdate = jest.fn();
      const { unmount } = renderHook(() =>
        useLiveCryptoPrices('btcusdt', onUpdate),
      );

      unmount();

      act(() => {
        capturedCallback({
          symbol: 'btcusdt',
          price: 67234.5,
          timestamp: 1700000000,
        });
      });

      expect(onUpdate).not.toHaveBeenCalled();
    });

    it('uses latest onUpdate callback (ref pattern)', () => {
      let capturedCallback: (update: CryptoPriceUpdate) => void = jest.fn();
      mockSubscribeToCryptoPrices.mockImplementation((_, callback) => {
        capturedCallback = callback;
        return mockUnsubscribe;
      });

      const onUpdate1 = jest.fn();
      const onUpdate2 = jest.fn();

      const { rerender } = renderHook(
        ({ onUpdate }) => useLiveCryptoPrices('btcusdt', onUpdate),
        { initialProps: { onUpdate: onUpdate1 } },
      );

      rerender({ onUpdate: onUpdate2 });

      const update: CryptoPriceUpdate = {
        symbol: 'btcusdt',
        price: 67234.5,
        timestamp: 1700000000,
      };

      act(() => {
        capturedCallback(update);
      });

      expect(onUpdate1).not.toHaveBeenCalled();
      expect(onUpdate2).toHaveBeenCalledWith(update);
    });
  });

  describe('connection status', () => {
    it('tracks connection status via polling', () => {
      const onUpdate = jest.fn();
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

      const { result } = renderHook(() =>
        useLiveCryptoPrices('btcusdt', onUpdate),
      );

      expect(result.current.isConnected).toBe(true);

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(result.current.isConnected).toBe(false);
    });

    it('sets isConnected to false when symbol is empty', () => {
      const onUpdate = jest.fn();
      const { result } = renderHook(() => useLiveCryptoPrices('', onUpdate));

      expect(result.current.isConnected).toBe(false);
    });
  });
});
