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

      renderHook(() => useLiveCryptoPrices('btc/usd', onUpdate));

      expect(mockSubscribeToCryptoPrices).toHaveBeenCalledWith(
        ['btc/usd'],
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
        useLiveCryptoPrices('btc/usd', onUpdate),
      );

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('resubscribes when symbol changes', () => {
      const onUpdate = jest.fn();
      const { rerender } = renderHook(
        ({ symbol }) => useLiveCryptoPrices(symbol, onUpdate),
        { initialProps: { symbol: 'btc/usd' } },
      );

      expect(mockSubscribeToCryptoPrices).toHaveBeenCalledTimes(1);

      rerender({ symbol: 'eth/usd' });

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
      renderHook(() => useLiveCryptoPrices('btc/usd', onUpdate));

      const update: CryptoPriceUpdate = {
        symbol: 'btc/usd',
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
        useLiveCryptoPrices('btc/usd', onUpdate),
      );

      unmount();

      act(() => {
        capturedCallback({
          symbol: 'btc/usd',
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
        ({ onUpdate }) => useLiveCryptoPrices('btc/usd', onUpdate),
        { initialProps: { onUpdate: onUpdate1 } },
      );

      rerender({ onUpdate: onUpdate2 });

      const update: CryptoPriceUpdate = {
        symbol: 'btc/usd',
        price: 67234.5,
        timestamp: 1700000000,
      };

      act(() => {
        capturedCallback(update);
      });

      expect(onUpdate1).not.toHaveBeenCalled();
      expect(onUpdate2).toHaveBeenCalledWith(update);
    });

    it('marks the stream connected when the first update arrives', () => {
      let capturedCallback: (update: CryptoPriceUpdate) => void = jest.fn();
      mockSubscribeToCryptoPrices.mockImplementation((_, callback) => {
        capturedCallback = callback;
        return mockUnsubscribe;
      });
      mockGetConnectionStatus.mockReturnValue({
        rtdsConnected: false,
        sportsConnected: false,
        marketConnected: false,
      });

      const onUpdate = jest.fn();
      const { result } = renderHook(() =>
        useLiveCryptoPrices('btc/usd', onUpdate),
      );

      expect(result.current.isConnected).toBe(false);

      const update: CryptoPriceUpdate = {
        symbol: 'btc/usd',
        price: 67234.5,
        timestamp: 1700000000,
      };

      act(() => {
        capturedCallback(update);
      });

      expect(result.current.isConnected).toBe(true);
      expect(onUpdate).toHaveBeenCalledWith(update);
    });

    it('keeps the stream connected when an update arrives during subscription', () => {
      const update: CryptoPriceUpdate = {
        symbol: 'btc/usd',
        price: 67234.5,
        timestamp: 1700000000,
      };
      mockSubscribeToCryptoPrices.mockImplementation((_, callback) => {
        callback(update);
        return mockUnsubscribe;
      });
      mockGetConnectionStatus.mockReturnValue({
        rtdsConnected: false,
        sportsConnected: false,
        marketConnected: false,
      });

      const onUpdate = jest.fn();
      const { result } = renderHook(() =>
        useLiveCryptoPrices('btc/usd', onUpdate),
      );

      expect(result.current.isConnected).toBe(true);
      expect(onUpdate).toHaveBeenCalledWith(update);
    });
  });

  describe('connection status', () => {
    it('reads initial connection status from getConnectionStatus', () => {
      const onUpdate = jest.fn();
      mockGetConnectionStatus.mockReturnValue({
        rtdsConnected: true,
        sportsConnected: false,
        marketConnected: false,
      });

      const { result } = renderHook(() =>
        useLiveCryptoPrices('btc/usd', onUpdate),
      );

      expect(result.current.isConnected).toBe(true);
    });

    it('sets isConnected to false when symbol is empty', () => {
      const onUpdate = jest.fn();
      const { result } = renderHook(() => useLiveCryptoPrices('', onUpdate));

      expect(result.current.isConnected).toBe(false);
    });
  });
});
