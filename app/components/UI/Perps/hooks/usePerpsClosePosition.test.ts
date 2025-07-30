import { renderHook, act } from '@testing-library/react-hooks';
import { usePerpsClosePosition } from './usePerpsClosePosition';
import { usePerpsTrading } from './usePerpsTrading';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import { strings } from '../../../../../locales/i18n';
import type { Position, OrderResult } from '../controllers/types';

// Mock dependencies
jest.mock('./usePerpsTrading');
jest.mock('../../../../core/SDKConnect/utils/DevLogger');
jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key) => key),
}));

describe('usePerpsClosePosition', () => {
  const mockClosePosition = jest.fn();
  const mockPosition: Position = {
    coin: 'BTC',
    size: '0.1',
    entryPrice: '50000',
    positionValue: '5000',
    unrealizedPnl: '100',
    marginUsed: '500',
    leverage: { type: 'cross', value: 10 },
    liquidationPrice: '45000',
    maxLeverage: 50,
    returnOnEquity: '20',
    cumulativeFunding: {
      allTime: '10',
      sinceOpen: '5',
      sinceChange: '2',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (usePerpsTrading as jest.Mock).mockReturnValue({
      closePosition: mockClosePosition,
    });
  });

  describe('handleClosePosition', () => {
    it('should successfully close a position with market order', async () => {
      const successResult: OrderResult = {
        success: true,
        orderId: '123',
      };
      mockClosePosition.mockResolvedValue(successResult);

      const onSuccess = jest.fn();
      const { result } = renderHook(() => usePerpsClosePosition({ onSuccess }));

      await act(async () => {
        const closeResult = await result.current.handleClosePosition(
          mockPosition,
        );
        expect(closeResult).toEqual(successResult);
      });

      expect(mockClosePosition).toHaveBeenCalledWith({
        coin: 'BTC',
        size: undefined,
        orderType: 'market',
        price: undefined,
      });

      expect(onSuccess).toHaveBeenCalledWith(successResult);
      expect(result.current.isClosing).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should successfully close a partial position with limit order', async () => {
      const successResult: OrderResult = {
        success: true,
        orderId: '456',
      };
      mockClosePosition.mockResolvedValue(successResult);

      const onSuccess = jest.fn();
      const { result } = renderHook(() => usePerpsClosePosition({ onSuccess }));

      await act(async () => {
        const closeResult = await result.current.handleClosePosition(
          mockPosition,
          '0.05',
          'limit',
          '51000',
        );
        expect(closeResult).toEqual(successResult);
      });

      expect(mockClosePosition).toHaveBeenCalledWith({
        coin: 'BTC',
        size: '0.05',
        orderType: 'limit',
        price: '51000',
      });

      expect(onSuccess).toHaveBeenCalledWith(successResult);
      expect(DevLogger.log).toHaveBeenCalledWith(
        'usePerpsClosePosition: Closing position',
        {
          coin: 'BTC',
          size: '0.05',
          orderType: 'limit',
          limitPrice: '51000',
        },
      );
    });

    it('should handle close position failure', async () => {
      const failureResult: OrderResult = {
        success: false,
        error: 'Insufficient balance',
      };
      mockClosePosition.mockResolvedValue(failureResult);

      const onError = jest.fn();
      const { result } = renderHook(() => usePerpsClosePosition({ onError }));

      await act(async () => {
        await expect(
          result.current.handleClosePosition(mockPosition),
        ).rejects.toThrow('Insufficient balance');
      });

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Insufficient balance',
        }),
      );
      expect(result.current.isClosing).toBe(false);
      expect(result.current.error).toEqual(
        expect.objectContaining({
          message: 'Insufficient balance',
        }),
      );
    });

    it('should handle close position failure with default error message', async () => {
      const failureResult: OrderResult = {
        success: false,
        error: undefined, // No specific error message
      };
      mockClosePosition.mockResolvedValue(failureResult);

      const onError = jest.fn();
      const { result } = renderHook(() => usePerpsClosePosition({ onError }));

      await act(async () => {
        await expect(
          result.current.handleClosePosition(mockPosition),
        ).rejects.toThrow('perps.close_position.error_unknown');
      });

      expect(strings).toHaveBeenCalledWith(
        'perps.close_position.error_unknown',
      );
    });

    it('should handle exceptions thrown by closePosition', async () => {
      const error = new Error('Network error');
      mockClosePosition.mockRejectedValue(error);

      const onError = jest.fn();
      const { result } = renderHook(() => usePerpsClosePosition({ onError }));

      await act(async () => {
        await expect(
          result.current.handleClosePosition(mockPosition),
        ).rejects.toThrow('Network error');
      });

      expect(onError).toHaveBeenCalledWith(error);
      expect(result.current.error).toBe(error);
      expect(DevLogger.log).toHaveBeenCalledWith(
        'usePerpsClosePosition: Error closing position',
        error,
      );
    });

    it('should handle non-Error exceptions', async () => {
      mockClosePosition.mockRejectedValue('String error');

      const onError = jest.fn();
      const { result } = renderHook(() => usePerpsClosePosition({ onError }));

      await act(async () => {
        await expect(
          result.current.handleClosePosition(mockPosition),
        ).rejects.toThrow('perps.close_position.error_unknown');
      });

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'perps.close_position.error_unknown',
        }),
      );
    });

    it('should set isClosing state correctly during operation', async () => {
      let resolvePromise: (value: OrderResult) => void;
      const promise = new Promise<OrderResult>((resolve) => {
        resolvePromise = resolve;
      });
      mockClosePosition.mockReturnValue(promise);

      const { result } = renderHook(() => usePerpsClosePosition());

      // Start closing
      let closePromise: Promise<OrderResult>;
      act(() => {
        closePromise = result.current.handleClosePosition(mockPosition);
      });

      // Check loading state
      expect(result.current.isClosing).toBe(true);

      // Resolve the promise
      await act(async () => {
        resolvePromise({ success: true, orderId: '789' });
        await closePromise;
      });

      // Check final state
      expect(result.current.isClosing).toBe(false);
    });

    it('should work without options', async () => {
      const successResult: OrderResult = {
        success: true,
        orderId: '999',
      };
      mockClosePosition.mockResolvedValue(successResult);

      const { result } = renderHook(() => usePerpsClosePosition());

      await act(async () => {
        const closeResult = await result.current.handleClosePosition(
          mockPosition,
          '0.1',
          'market',
        );
        expect(closeResult).toEqual(successResult);
      });

      expect(mockClosePosition).toHaveBeenCalledWith({
        coin: 'BTC',
        size: '0.1',
        orderType: 'market',
        price: undefined,
      });
    });

    it('should log all operations correctly', async () => {
      const successResult: OrderResult = {
        success: true,
        orderId: '111',
        filledSize: '0.1',
        averagePrice: '50100',
      };
      mockClosePosition.mockResolvedValue(successResult);

      const { result } = renderHook(() => usePerpsClosePosition());

      await act(async () => {
        await result.current.handleClosePosition(mockPosition);
      });

      // Check logging calls
      expect(DevLogger.log).toHaveBeenCalledWith(
        'usePerpsClosePosition: Closing position',
        {
          coin: 'BTC',
          size: undefined,
          orderType: 'market',
          limitPrice: undefined,
        },
      );

      expect(DevLogger.log).toHaveBeenCalledWith(
        'usePerpsClosePosition: Close result',
        successResult,
      );
    });

    it('should handle position with TP/SL correctly', async () => {
      const positionWithTPSL: Position = {
        ...mockPosition,
        takeProfitPrice: '55000',
        stopLossPrice: '45000',
      };

      const successResult: OrderResult = {
        success: true,
        orderId: '222',
      };
      mockClosePosition.mockResolvedValue(successResult);

      const { result } = renderHook(() => usePerpsClosePosition());

      await act(async () => {
        const closeResult = await result.current.handleClosePosition(
          positionWithTPSL,
        );
        expect(closeResult).toEqual(successResult);
      });

      // The hook doesn't need special handling for TP/SL as that's done in the provider
      expect(mockClosePosition).toHaveBeenCalledWith({
        coin: 'BTC',
        size: undefined,
        orderType: 'market',
        price: undefined,
      });
    });

    it('should reset error state on new close attempt', async () => {
      // First attempt fails
      mockClosePosition.mockRejectedValueOnce(new Error('First error'));

      const { result } = renderHook(() => usePerpsClosePosition());

      await act(async () => {
        await expect(
          result.current.handleClosePosition(mockPosition),
        ).rejects.toThrow('First error');
      });

      expect(result.current.error).toEqual(
        expect.objectContaining({ message: 'First error' }),
      );

      // Second attempt succeeds
      mockClosePosition.mockResolvedValueOnce({
        success: true,
        orderId: '333',
      });

      await act(async () => {
        await result.current.handleClosePosition(mockPosition);
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('hook lifecycle', () => {
    it('should maintain state across re-renders', async () => {
      const successResult: OrderResult = {
        success: true,
        orderId: '444',
      };
      mockClosePosition.mockResolvedValue(successResult);

      const { result, rerender } = renderHook(() => usePerpsClosePosition());

      await act(async () => {
        await result.current.handleClosePosition(mockPosition);
      });

      const handleClosePositionBefore = result.current.handleClosePosition;

      // Re-render the hook
      rerender();

      // handleClosePosition should be stable due to useCallback
      expect(result.current.handleClosePosition).toBe(
        handleClosePositionBefore,
      );
    });

    it('should update callbacks when options change', async () => {
      const onSuccess1 = jest.fn();
      const onSuccess2 = jest.fn();

      const { result, rerender } = renderHook(
        ({ onSuccess }) => usePerpsClosePosition({ onSuccess }),
        { initialProps: { onSuccess: onSuccess1 } },
      );

      const handleClosePositionBefore = result.current.handleClosePosition;

      // Change the onSuccess callback
      rerender({ onSuccess: onSuccess2 });

      // handleClosePosition should be a new function
      expect(result.current.handleClosePosition).not.toBe(
        handleClosePositionBefore,
      );

      // Execute with new callback
      mockClosePosition.mockResolvedValue({ success: true, orderId: '555' });

      await act(async () => {
        await result.current.handleClosePosition(mockPosition);
      });

      expect(onSuccess1).not.toHaveBeenCalled();
      expect(onSuccess2).toHaveBeenCalled();
    });
  });
});
