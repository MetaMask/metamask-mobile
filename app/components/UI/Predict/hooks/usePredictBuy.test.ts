import { renderHook, act } from '@testing-library/react-native';
import Engine from '../../../../core/Engine';
import { Side } from '../types';
import { usePredictBuy } from './usePredictBuy';

// Mock Engine
jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      buy: jest.fn(),
    },
  },
}));

const mockBuyOrder = Engine.context.PredictController.buy as jest.Mock;

describe('usePredictPlaceOrder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('returns initial state correctly', () => {
      const { result } = renderHook(() => usePredictBuy());

      expect(result.current.isPlacing).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.lastResult).toBe(null);
      expect(typeof result.current.placeBuyOrder).toBe('function');
      expect(typeof result.current.reset).toBe('function');
    });
  });

  describe('placeOrder', () => {
    const mockOrderParams = {
      marketId: 'market-123',
      outcomeId: 'outcome-456',
      side: Side.BUY,
      amount: 100,
    };

    const mockOrderResult = {
      txMeta: { id: 'tx-123' },
      providerId: 'provider-789',
    };

    it('places order successfully and updates state', async () => {
      mockBuyOrder.mockResolvedValue(mockOrderResult);

      const { result } = renderHook(() => usePredictBuy());

      await act(async () => {
        await result.current.placeBuyOrder(mockOrderParams);
      });

      expect(mockBuyOrder).toHaveBeenCalledWith(mockOrderParams);
      expect(result.current.isPlacing).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.lastResult).toEqual(mockOrderResult);
    });

    it('handles errors from placeOrder and updates state', async () => {
      const mockError = new Error('Failed to place order');
      mockBuyOrder.mockRejectedValue(mockError);

      const { result } = renderHook(() => usePredictBuy());

      await act(async () => {
        await result.current.placeBuyOrder(mockOrderParams);
      });

      expect(mockBuyOrder).toHaveBeenCalledWith(mockOrderParams);
      expect(result.current.isPlacing).toBe(false);
      expect(result.current.error).toBe('Failed to place order');
      expect(result.current.lastResult).toBe(null);
    });

    it('handles non-Error objects thrown from placeOrder', async () => {
      mockBuyOrder.mockRejectedValue('String error');

      const { result } = renderHook(() => usePredictBuy());

      await act(async () => {
        await result.current.placeBuyOrder(mockOrderParams);
      });

      expect(result.current.error).toBe('Failed to place order');
    });

    it('clears previous error when starting new order', async () => {
      const { result } = renderHook(() => usePredictBuy());

      // First, set an error state
      mockBuyOrder.mockRejectedValueOnce(new Error('First error'));

      await act(async () => {
        await result.current.placeBuyOrder(mockOrderParams);
      });

      expect(result.current.error).toBe('First error');

      // Now try a successful order
      mockBuyOrder.mockResolvedValueOnce(mockOrderResult);

      await act(async () => {
        await result.current.placeBuyOrder(mockOrderParams);
      });

      expect(result.current.error).toBe(null);
      expect(result.current.lastResult).toEqual(mockOrderResult);
    });
  });

  describe('callbacks', () => {
    const mockOrderParams = {
      marketId: 'market-123',
      outcomeId: 'outcome-456',
      side: Side.BUY,
      amount: 100,
    };

    const mockOrderResult = {
      txMeta: { id: 'tx-123' },
      providerId: 'provider-789',
    };

    it('calls onSuccess callback when order is placed successfully', async () => {
      const onSuccessMock = jest.fn();
      const onErrorMock = jest.fn();

      mockBuyOrder.mockResolvedValue(mockOrderResult);

      const { result } = renderHook(() =>
        usePredictBuy({
          onSuccess: onSuccessMock,
          onError: onErrorMock,
        }),
      );

      await act(async () => {
        await result.current.placeBuyOrder(mockOrderParams);
      });

      expect(onSuccessMock).toHaveBeenCalledWith(mockOrderResult);
      expect(onSuccessMock).toHaveBeenCalledTimes(1);
      expect(onErrorMock).not.toHaveBeenCalled();
    });

    it('calls onError callback when order placement fails', async () => {
      const onSuccessMock = jest.fn();
      const onErrorMock = jest.fn();

      const mockError = new Error('Network error');
      mockBuyOrder.mockRejectedValue(mockError);

      const { result } = renderHook(() =>
        usePredictBuy({
          onSuccess: onSuccessMock,
          onError: onErrorMock,
        }),
      );

      await act(async () => {
        await result.current.placeBuyOrder(mockOrderParams);
      });

      expect(onErrorMock).toHaveBeenCalledWith('Network error');
      expect(onErrorMock).toHaveBeenCalledTimes(1);
      expect(onSuccessMock).not.toHaveBeenCalled();
    });
  });

  describe('reset', () => {
    it('resets all state to initial values', async () => {
      const { result } = renderHook(() => usePredictBuy());

      // Set some state
      mockBuyOrder.mockResolvedValue({
        txMeta: { id: 'test' },
        providerId: 'test',
      });

      await act(async () => {
        await result.current.placeBuyOrder({
          marketId: 'test',
          outcomeId: 'test',
          amount: 10,
        });
      });

      expect(result.current.lastResult).not.toBe(null);
      expect(result.current.error).toBe(null);
      expect(result.current.isPlacing).toBe(false);

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.lastResult).toBe(null);
      expect(result.current.error).toBe(null);
      expect(result.current.isPlacing).toBe(false);
    });
  });

  describe('hook stability', () => {
    it('returns stable function references', () => {
      const { result, rerender } = renderHook(() => usePredictBuy());

      const initialPlaceOrder = result.current.placeBuyOrder;
      const initialReset = result.current.reset;

      rerender({});

      expect(result.current.placeBuyOrder).toBe(initialPlaceOrder);
      expect(result.current.reset).toBe(initialReset);
    });
  });
});
