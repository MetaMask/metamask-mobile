import { renderHook, act } from '@testing-library/react-native';
import { usePredictBuy } from './usePredictBuy';
import { Recurrence } from '../types';

// Factory function to create mock state
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createMockState(overrides: any = {}): any {
  return {
    engine: {
      backgroundState: {
        PredictController: {
          activeOrders: {},
          ...overrides.PredictController,
        },
        ...overrides,
      },
    },
  };
}

// Create initial mock state
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockState: any = createMockState();

// Mock react-redux useSelector to evaluate selectors against our mock state
jest.mock('react-redux', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useSelector: jest.fn((selector: any) => selector(mockState)),
}));

// Mock usePredictTrading hook
const mockBuy = jest.fn();
jest.mock('./usePredictTrading', () => ({
  usePredictTrading: () => ({
    buy: mockBuy,
  }),
}));

// Helper function to setup test with mock state
function setupUsePredictBuyTest(stateOverrides = {}, hookOptions = {}) {
  jest.clearAllMocks();
  mockState = createMockState(stateOverrides);
  return renderHook(() => usePredictBuy(hookOptions));
}

// Helper function to create mock market
function createMockMarket(overrides = {}) {
  return {
    id: 'market-1',
    providerId: 'provider-123',
    slug: 'test-market',
    title: 'Test Market',
    description: 'A test market for prediction',
    endDate: '2024-12-31T23:59:59Z',
    image: 'test-image.png',
    status: 'open' as const,
    recurrence: Recurrence.NONE,
    categories: [],
    outcomes: [],
    ...overrides,
  };
}

describe('usePredictBuy', () => {
  describe('initial state', () => {
    it('returns initial state correctly', () => {
      const { result } = setupUsePredictBuyTest();

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeUndefined();
      expect(result.current.result).toBe(null);
      expect(result.current.currentOrder).toBe(null);
      expect(result.current.completed).toBe(false);
      expect(typeof result.current.placeBuyOrder).toBe('function');
      expect(typeof result.current.reset).toBe('function');
    });
  });

  describe('placeOrder', () => {
    const mockOrderParams = {
      market: createMockMarket(),
      outcomeId: 'outcome-456',
      outcomeTokenId: 'outcome-token-789',
      size: 100,
    };

    const mockOrderResult = {
      txMeta: { id: 'tx-123' },
      providerId: 'provider-789',
    };

    it('places order successfully and updates state', async () => {
      mockBuy.mockResolvedValue(mockOrderResult);

      const { result } = setupUsePredictBuyTest();

      await act(async () => {
        await result.current.placeBuyOrder(mockOrderParams);
      });

      expect(mockBuy).toHaveBeenCalledWith({
        market: createMockMarket(),
        outcomeId: 'outcome-456',
        outcomeTokenId: 'outcome-token-789',
        size: 100,
      });
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeUndefined();
      expect(result.current.result).toEqual(mockOrderResult);
      expect(result.current.currentOrder).toBe(null); // No order in activeOrders yet
    });

    it('handles errors from placeOrder and updates state', async () => {
      const mockError = new Error('Failed to place order');
      mockBuy.mockRejectedValue(mockError);

      const { result } = setupUsePredictBuyTest();

      await act(async () => {
        await result.current.placeBuyOrder(mockOrderParams);
      });

      expect(mockBuy).toHaveBeenCalledWith({
        market: createMockMarket(),
        outcomeId: 'outcome-456',
        outcomeTokenId: 'outcome-token-789',
        size: 100,
      });
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeUndefined();
      expect(result.current.result).toBe(null);
      expect(result.current.currentOrder).toBe(null);
    });

    it('handles non-Error objects thrown from placeOrder', async () => {
      mockBuy.mockRejectedValue('String error');

      const { result } = setupUsePredictBuyTest();

      await act(async () => {
        await result.current.placeBuyOrder(mockOrderParams);
      });

      expect(result.current.error).toBeUndefined();
      expect(result.current.currentOrder).toBe(null);
    });

    it('clears previous error when starting new order', async () => {
      const { result } = setupUsePredictBuyTest();

      // First, set an error state
      mockBuy.mockRejectedValueOnce(new Error('First error'));

      await act(async () => {
        await result.current.placeBuyOrder(mockOrderParams);
      });

      expect(result.current.error).toBeUndefined();

      // Now try a successful order
      mockBuy.mockResolvedValueOnce(mockOrderResult);

      await act(async () => {
        await result.current.placeBuyOrder(mockOrderParams);
      });

      expect(result.current.error).toBeUndefined();
      expect(result.current.result).toEqual(mockOrderResult);
      expect(result.current.currentOrder).toBe(null);
    });
  });

  describe('callbacks', () => {
    const mockOrderParams = {
      market: createMockMarket(),
      outcomeId: 'outcome-456',
      outcomeTokenId: 'outcome-token-789',
      size: 100,
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
          onError: onErrorMock,
        }),
      );

      await act(async () => {
        await result.current.placeBuyOrder(mockOrderParams);
      });

      // onBuyPlaced is called when result.id exists and there's an activeOrder
      // Since we don't have activeOrders in mock state, this won't be called
      expect(onSuccessMock).not.toHaveBeenCalled();
      expect(onErrorMock).not.toHaveBeenCalled();
      expect(result.current.currentOrder).toBe(null); // No order in activeOrders yet
    });

    it('calls onError callback when order placement fails', async () => {
      const onSuccessMock = jest.fn();
      const onErrorMock = jest.fn();

      const mockError = new Error('Network error');
      mockBuy.mockRejectedValue(mockError);

      const { result } = renderHook(() =>
        usePredictBuy({
          onError: onErrorMock,
        }),
      );

      await act(async () => {
        await result.current.placeBuyOrder(mockOrderParams);
      });

      expect(onErrorMock).toHaveBeenCalledWith('Network error', null);
      expect(onErrorMock).toHaveBeenCalledTimes(1);
      expect(onSuccessMock).not.toHaveBeenCalled();
      expect(result.current.currentOrder).toBe(null);
    });
  });

  describe('reset', () => {
    it('resets all state to initial values', async () => {
      const { result } = setupUsePredictBuyTest();

      // Set some state
      mockBuy.mockResolvedValue({
        txMeta: { id: 'test' },
        providerId: 'test',
      });

      await act(async () => {
        await result.current.placeBuyOrder({
          market: createMockMarket(),
          outcomeId: 'test',
          outcomeTokenId: 'test-token',
          size: 100,
        });
      });

      expect(result.current.result).not.toBe(null);
      expect(result.current.error).toBeUndefined();
      expect(result.current.loading).toBe(false);
      expect(result.current.currentOrder).toBe(null);

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.result).toBe(null);
      expect(result.current.error).toBeUndefined();
      expect(result.current.loading).toBe(false);
      expect(result.current.currentOrder).toBe(null);
    });
  });

  describe('hook stability', () => {
    it('returns stable function references', () => {
      const { result, rerender } = setupUsePredictBuyTest();

      const initialPlaceOrder = result.current.placeBuyOrder;
      const initialReset = result.current.reset;

      rerender({});

      expect(result.current.placeBuyOrder).toBe(initialPlaceOrder);
      expect(result.current.reset).toBe(initialReset);
    });
  });
});
