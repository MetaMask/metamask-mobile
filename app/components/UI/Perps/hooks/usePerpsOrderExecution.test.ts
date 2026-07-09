import { renderHook, act, waitFor } from '@testing-library/react-native';
import { type OrderParams, type Position } from '@metamask/perps-controller';
import { usePerpsOrderExecution } from './usePerpsOrderExecution';
import { usePerpsTrading } from './usePerpsTrading';

jest.mock('./usePerpsTrading');
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

  describe('successful order placement', () => {
    it('places order and fetches position then calls onSuccess with position', async () => {
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

    it('calls onSuccess with no args when position is not found after order', async () => {
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

    it('calls onSuccess with no args when position fetch rejects', async () => {
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

      expect(onSuccess).toHaveBeenCalledWith();
      expect(onError).not.toHaveBeenCalled();
    });

    it('still calls onSuccess when filledSize is partial (controller owns trade analytics)', async () => {
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

      mockPlaceOrder.mockResolvedValue({
        success: true,
        orderId: 'order123',
        filledSize: '0.1',
      });
      mockGetPositions.mockResolvedValue([mockPosition]);

      const { result } = renderHook(() =>
        usePerpsOrderExecution({ onSuccess, onError: jest.fn() }),
      );

      await act(async () => {
        await result.current.placeOrder(paramsWithTracking);
      });

      await waitFor(() => {
        expect(result.current.isPlacing).toBe(false);
      });

      expect(onSuccess).toHaveBeenCalledWith(mockPosition);
      expect(mockPlaceOrder).toHaveBeenCalledWith(paramsWithTracking);
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

    it('forwards trackingData to controller on failed order without client trade analytics', async () => {
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

      expect(onError).toHaveBeenCalledWith('Insufficient margin');
      expect(mockPlaceOrder).toHaveBeenCalledWith(paramsWithTracking);
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

    it('forwards trackingData to controller when placeOrder rejects without client trade analytics', async () => {
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

      expect(onError).toHaveBeenCalledWith('Network timeout');
      expect(mockPlaceOrder).toHaveBeenCalledWith(paramsWithTracking);
    });
  });

  describe('error state management', () => {
    it('clears error when a subsequent order placement succeeds', async () => {
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
    it('updates lastResult when placeOrder succeeds and no onSuccess provided', async () => {
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
