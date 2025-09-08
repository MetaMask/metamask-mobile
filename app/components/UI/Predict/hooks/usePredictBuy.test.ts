import { renderHook, act } from '@testing-library/react-native';
import { usePredictBuy } from './usePredictBuy';

// Mock usePredictTrading hook
const mockBuy = jest.fn();
jest.mock('./usePredictTrading', () => ({
  usePredictTrading: () => ({
    buy: mockBuy,
  }),
}));

describe('usePredictBuy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('returns initial state correctly', () => {
      const { result } = renderHook(() => usePredictBuy());

      expect(result.current.isPlacing).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.lastResult).toBe(null);
      expect(result.current.currentOrder).toBe(null);
      expect(typeof result.current.placeBuyOrder).toBe('function');
      expect(typeof result.current.reset).toBe('function');
    });
  });

  describe('placeOrder', () => {
    const mockOrderParams = {
      providerId: 'provider-123',
      marketId: 'market-123',
      outcomeId: 'outcome-456',
      outcomeTokenId: 'outcome-token-789',
      amount: 100,
    };

    const mockOrderResult = {
      txMeta: { id: 'tx-123' },
      providerId: 'provider-789',
    };

    it('places order successfully and updates state', async () => {
      mockBuy.mockResolvedValue(mockOrderResult);

      const { result } = renderHook(() => usePredictBuy());

      await act(async () => {
        await result.current.placeBuyOrder(mockOrderParams);
      });

      expect(mockBuy).toHaveBeenCalledWith({
        amount: 100,
        marketId: 'market-123',
        outcomeId: 'outcome-456',
        outcomeTokenId: 'outcome-token-789',
        providerId: 'provider-123',
      });
      expect(result.current.isPlacing).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.lastResult).toEqual(mockOrderResult);
      expect(result.current.currentOrder).toEqual(mockOrderParams);
    });

    it('handles errors from placeOrder and updates state', async () => {
      const mockError = new Error('Failed to place order');
      mockBuy.mockRejectedValue(mockError);

      const { result } = renderHook(() => usePredictBuy());

      await act(async () => {
        await result.current.placeBuyOrder(mockOrderParams);
      });

      expect(mockBuy).toHaveBeenCalledWith({
        amount: 100,
        marketId: 'market-123',
        outcomeId: 'outcome-456',
        outcomeTokenId: 'outcome-token-789',
        providerId: 'provider-123',
      });
      expect(result.current.isPlacing).toBe(false);
      expect(result.current.error).toBe('Failed to place order');
      expect(result.current.lastResult).toBe(null);
      expect(result.current.currentOrder).toEqual(mockOrderParams);
    });

    it('handles non-Error objects thrown from placeOrder', async () => {
      mockBuy.mockRejectedValue('String error');

      const { result } = renderHook(() => usePredictBuy());

      await act(async () => {
        await result.current.placeBuyOrder(mockOrderParams);
      });

      expect(result.current.error).toBe('Failed to place order');
      expect(result.current.currentOrder).toEqual(mockOrderParams);
    });

    it('clears previous error when starting new order', async () => {
      const { result } = renderHook(() => usePredictBuy());

      // First, set an error state
      mockBuy.mockRejectedValueOnce(new Error('First error'));

      await act(async () => {
        await result.current.placeBuyOrder(mockOrderParams);
      });

      expect(result.current.error).toBe('First error');

      // Now try a successful order
      mockBuy.mockResolvedValueOnce(mockOrderResult);

      await act(async () => {
        await result.current.placeBuyOrder(mockOrderParams);
      });

      expect(result.current.error).toBe(null);
      expect(result.current.lastResult).toEqual(mockOrderResult);
      expect(result.current.currentOrder).toEqual(mockOrderParams);
    });
  });

  describe('callbacks', () => {
    const mockOrderParams = {
      providerId: 'provider-123',
      marketId: 'market-123',
      outcomeId: 'outcome-456',
      outcomeTokenId: 'outcome-token-789',
      amount: 100,
    };

    const mockOrderResult = {
      txMeta: { id: 'tx-123' },
      providerId: 'provider-789',
    };

    it('calls onSuccess callback when order is placed successfully', async () => {
      const onSuccessMock = jest.fn();
      const onErrorMock = jest.fn();

      mockBuy.mockResolvedValue(mockOrderResult);

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
      mockBuy.mockRejectedValue(mockError);

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
      mockBuy.mockResolvedValue({
        txMeta: { id: 'test' },
        providerId: 'test',
      });

      await act(async () => {
        await result.current.placeBuyOrder({
          providerId: 'test',
          marketId: 'test',
          outcomeId: 'test',
          outcomeTokenId: 'test-token',
          amount: 10,
        });
      });

      expect(result.current.lastResult).not.toBe(null);
      expect(result.current.error).toBe(null);
      expect(result.current.isPlacing).toBe(false);
      expect(result.current.currentOrder).not.toBe(null);

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.lastResult).toBe(null);
      expect(result.current.error).toBe(null);
      expect(result.current.isPlacing).toBe(false);
      expect(result.current.currentOrder).toBe(null);
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
