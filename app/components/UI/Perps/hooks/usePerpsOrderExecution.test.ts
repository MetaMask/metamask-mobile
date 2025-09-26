import { renderHook, act, waitFor } from '@testing-library/react-native';
import { usePerpsOrderExecution } from './usePerpsOrderExecution';
import { usePerpsTrading } from './usePerpsTrading';
import type { OrderParams, Position } from '../controllers/types';

jest.mock('./usePerpsTrading');
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
  const mockGetPositions = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPositions.mockResolvedValue([]); // Setup default
    (usePerpsTrading as jest.Mock).mockReturnValue({
      placeOrder: mockPlaceOrder,
      getPositions: mockGetPositions,
    });
  });

  const mockOrderParams: OrderParams = {
    coin: 'BTC',
    isBuy: true,
    size: '0.1',
    orderType: 'market',
    leverage: 10,
  };

  const mockPosition: Position = {
    coin: 'BTC',
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

  describe('successful order placement', () => {
    it('should place order and fetch position', async () => {
      const onSuccess = jest.fn();
      const onError = jest.fn();

      mockPlaceOrder.mockResolvedValue({
        success: true,
        orderId: 'order123',
      });
      mockGetPositions.mockResolvedValue([mockPosition]);

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
      expect(mockGetPositions).toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalledWith(mockPosition);
      expect(onError).not.toHaveBeenCalled();
      expect(result.current.lastResult).toEqual({
        success: true,
        orderId: 'order123',
      });
      expect(result.current.error).toBeUndefined();
    });

    it('should handle success without finding position', async () => {
      const onSuccess = jest.fn();

      mockPlaceOrder.mockResolvedValue({
        success: true,
        orderId: 'order123',
      });
      mockGetPositions.mockResolvedValue([]); // No positions

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
    });

    it('should handle position fetch error gracefully', async () => {
      const onSuccess = jest.fn();
      const onError = jest.fn();

      mockPlaceOrder.mockResolvedValue({
        success: true,
        orderId: 'order123',
      });
      mockGetPositions.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() =>
        usePerpsOrderExecution({ onSuccess, onError }),
      );

      await act(async () => {
        await result.current.placeOrder(mockOrderParams);
      });

      await waitFor(() => {
        expect(result.current.isPlacing).toBe(false);
      });

      // Should still call success even if position fetch fails
      expect(onSuccess).toHaveBeenCalledWith();
      expect(onError).not.toHaveBeenCalled();
    });
  });

  describe('failed order placement', () => {
    it('should handle order failure with error message', async () => {
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

    it('should handle order failure without error message', async () => {
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

    it('should handle order placement exception', async () => {
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
  });

  describe('error state management', () => {
    it('should clear error on new order placement', async () => {
      mockPlaceOrder
        .mockResolvedValueOnce({ success: false, error: 'First error' })
        .mockResolvedValueOnce({ success: true });

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
    it('should work without onSuccess callback', async () => {
      mockPlaceOrder.mockResolvedValue({ success: true });

      const { result } = renderHook(() => usePerpsOrderExecution());

      await act(async () => {
        await result.current.placeOrder(mockOrderParams);
      });

      await waitFor(() => {
        expect(result.current.isPlacing).toBe(false);
      });

      expect(result.current.lastResult?.success).toBe(true);
    });

    it('should work without onError callback', async () => {
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
