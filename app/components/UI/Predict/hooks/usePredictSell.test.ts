import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { ToastContext } from '../../../../component-library/components/Toast';
import { usePredictSell } from './usePredictSell';

// Mock redux state container that tests can mutate between runs
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockState: any = {
  engine: {
    backgroundState: {
      PredictController: {
        activeOrders: {},
      },
    },
  },
};

// Mock react-redux useSelector to evaluate selectors against our mock state
jest.mock('react-redux', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useSelector: jest.fn((selector: any) => selector(mockState)),
}));

// Mock usePredictTrading hook
const mockSell = jest.fn();
jest.mock('./usePredictTrading', () => ({
  usePredictTrading: () => ({
    sell: mockSell,
  }),
}));

// Mock ToastContext
const mockToastRef = {
  current: {
    showToast: jest.fn(),
    closeToast: jest.fn(),
  },
};

jest.mock('../../../../component-library/components/Toast', () => {
  const ReactActual = jest.requireActual('react');
  return {
    ToastContext: ReactActual.createContext({ toastRef: mockToastRef }),
    ToastContextWrapper: ({ children }: { children: React.ReactNode }) =>
      children,
    ToastVariants: {
      Icon: 'icon',
    },
  };
});

// Note: ToastContext default value provides the mock toast ref

jest.mock('../../../../component-library/components/Icons/Icon', () => ({
  IconName: {
    Loading: 'loading',
  },
}));

// Mock DevLogger
jest.mock('../../../../core/SDKConnect/utils/DevLogger', () => ({
  DevLogger: {
    log: jest.fn(),
  },
}));

describe('usePredictSell', () => {
  const mockPosition = {
    id: 'position-1',
    providerId: 'provider-123',
    marketId: 'market-1',
    outcomeId: 'outcome-456',
    outcome: 'Test Outcome',
    outcomeTokenId: 'outcome-token-789',
    title: 'Test Position',
    icon: 'test-icon.png',
    amount: 100,
    price: 0.5,
    status: 'open' as const,
    size: 50,
    outcomeIndex: 0,
    realizedPnl: 10,
    curPrice: 0.6,
    conditionId: 'condition-123',
    percentPnl: 20,
    cashPnl: 5,
    redeemable: true,
    initialValue: 50,
    avgPrice: 0.5,
    currentValue: 60,
    endDate: '2024-12-31',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockState = {
      engine: {
        backgroundState: {
          PredictController: {
            activeOrders: {},
          },
        },
      },
    };
  });

  describe('initial state', () => {
    it('returns initial state correctly', () => {
      const { result } = renderHook(() => usePredictSell());

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeUndefined();
      expect(result.current.result).toBe(null);
      expect(result.current.currentOrder).toBe(null);
      expect(result.current.currentOrderParams).toBe(null);
      expect(result.current.completed).toBe(false);
      expect(typeof result.current.placeSellOrder).toBe('function');
      expect(typeof result.current.reset).toBe('function');
    });
  });

  describe('placeSellOrder', () => {
    const mockSellParams = {
      position: mockPosition,
    };

    const mockSellResult = {
      success: true,
      id: 'order-123',
    };

    it('places order successfully and updates state', async () => {
      mockSell.mockResolvedValue(mockSellResult);

      const { result } = renderHook(() => usePredictSell());

      await act(async () => {
        await result.current.placeSellOrder(mockSellParams);
      });

      expect(mockSell).toHaveBeenCalledWith({
        position: mockPosition,
      });
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeUndefined();
      expect(result.current.result).toEqual(mockSellResult);
      expect(result.current.currentOrder).toBeUndefined(); // No order in activeOrders yet
    });

    it('handles errors from placeSellOrder and updates state', async () => {
      const mockError = new Error('Failed to place sell order');
      mockSell.mockRejectedValue(mockError);

      const { result } = renderHook(() => usePredictSell());

      await act(async () => {
        await result.current.placeSellOrder(mockSellParams);
      });

      expect(mockSell).toHaveBeenCalledWith({
        position: mockPosition,
      });
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeUndefined();
      expect(result.current.result).toBe(null);
      expect(result.current.currentOrder).toBe(null);
    });

    it('handles non-Error objects thrown from placeSellOrder', async () => {
      mockSell.mockRejectedValue('String error');

      const { result } = renderHook(() => usePredictSell());

      await act(async () => {
        await result.current.placeSellOrder(mockSellParams);
      });

      expect(result.current.error).toBeUndefined();
      expect(result.current.currentOrder).toBe(null);
    });

    it('clears previous error when starting new order', async () => {
      const { result } = renderHook(() => usePredictSell());

      // First, set an error state
      mockSell.mockRejectedValueOnce(new Error('First error'));

      await act(async () => {
        await result.current.placeSellOrder(mockSellParams);
      });

      expect(result.current.error).toBeUndefined();

      // Now try a successful order
      mockSell.mockResolvedValueOnce(mockSellResult);

      await act(async () => {
        await result.current.placeSellOrder(mockSellParams);
      });

      expect(result.current.error).toBeUndefined();
      expect(result.current.result).toEqual(mockSellResult);
      expect(result.current.currentOrder).toBeUndefined(); // Should be undefined after successful order, no active order yet
    });

    it('shows toast when placing order', async () => {
      mockSell.mockResolvedValue(mockSellResult);

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(
          ToastContext.Provider,
          { value: { toastRef: mockToastRef } },
          children,
        );

      const { result } = renderHook(() => usePredictSell(), { wrapper });

      await act(async () => {
        await result.current.placeSellOrder(mockSellParams);
      });

      expect(mockToastRef.current?.showToast).toHaveBeenCalledWith({
        variant: expect.any(String),
        iconName: expect.any(String),
        labelOptions: [{ label: 'Order placed' }],
        hasNoTimeout: false,
      });
    });
  });

  describe('callbacks', () => {
    const mockSellParams = {
      position: mockPosition,
      outcomeId: 'outcome-456',
      outcomeTokenId: 'outcome-token-789',
      quantity: 50,
    };

    const mockSellResult = {
      success: true,
      id: 'order-123',
    };

    const mockActiveOrder = {
      id: 'order-123',
      providerId: 'provider-123',
      chainId: 1,
      outcomeId: 'outcome-456',
      outcomeTokenId: 'outcome-token-789',
      isBuy: false,
      amount: 50,
      price: 0.5,
      status: 'pending',
      timestamp: Date.now(),
      lastUpdated: Date.now(),
      onchainTradeParams: [],
    };

    it('calls onError callback when order placement fails', async () => {
      const onErrorMock = jest.fn();

      const mockError = new Error('Network error');
      mockSell.mockRejectedValue(mockError);

      const { result } = renderHook(() =>
        usePredictSell({
          onError: onErrorMock,
        }),
      );

      await act(async () => {
        await result.current.placeSellOrder(mockSellParams);
      });

      expect(onErrorMock).toHaveBeenCalledWith('Network error', null);
      expect(onErrorMock).toHaveBeenCalledTimes(1);
      expect(result.current.currentOrder).toBe(null);
    });

    it('calls onComplete callback when order is completed', async () => {
      const onCompleteMock = jest.fn();

      const completedOrder = {
        ...mockActiveOrder,
        status: 'filled',
      };

      // First place the order
      mockSell.mockResolvedValue(mockSellResult);

      mockState.engine.backgroundState.PredictController.activeOrders = {
        'order-123': mockActiveOrder,
      };

      const { result, rerender } = renderHook(() =>
        usePredictSell({
          onComplete: onCompleteMock,
        }),
      );

      await act(async () => {
        await result.current.placeSellOrder(mockSellParams);
      });

      // Now update the order to completed
      mockState.engine.backgroundState.PredictController.activeOrders = {
        'order-123': completedOrder,
      };

      rerender({});

      await waitFor(() => {
        expect(onCompleteMock).toHaveBeenCalledWith(completedOrder);
        expect(result.current.completed).toBe(true);
      });
    });
  });

  describe('reset', () => {
    it('resets all state to initial values', async () => {
      const { result } = renderHook(() => usePredictSell());

      // Set some state
      mockSell.mockResolvedValue({
        success: true,
        id: 'test-order',
      });

      await act(async () => {
        await result.current.placeSellOrder({
          position: mockPosition,
        });
      });

      expect(result.current.result).not.toBe(null);
      expect(result.current.error).toBeUndefined();
      expect(result.current.loading).toBe(false);
      expect(result.current.currentOrder).toBeUndefined();

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

  describe('error handling from order state', () => {
    it('shows error from currentOrder when present', async () => {
      const orderWithError = {
        id: 'order-123',
        providerId: 'provider-123',
        chainId: 1,
        outcomeId: 'outcome-456',
        outcomeTokenId: 'outcome-token-789',
        isBuy: false,
        amount: 50,
        price: 0.5,
        status: 'error',
        error: 'Order failed',
        timestamp: Date.now(),
        lastUpdated: Date.now(),
        onchainTradeParams: [],
      };

      mockState.engine.backgroundState.PredictController.activeOrders = {
        'order-123': orderWithError,
      };

      mockSell.mockResolvedValue({ success: true, id: 'order-123' });

      const { result } = renderHook(() => usePredictSell());

      await act(async () => {
        await result.current.placeSellOrder({
          position: mockPosition,
        });
      });

      expect(result.current.error).toBe('Order failed');
      expect(result.current.currentOrder).toEqual(orderWithError);
    });

    it('prioritizes result error over order error', async () => {
      const orderWithError = {
        id: 'order-123',
        providerId: 'provider-123',
        chainId: 1,
        outcomeId: 'outcome-456',
        outcomeTokenId: 'outcome-token-789',
        isBuy: false,
        amount: 50,
        price: 0.5,
        status: 'error',
        error: 'Order failed',
        timestamp: Date.now(),
        lastUpdated: Date.now(),
        onchainTradeParams: [],
      };

      mockState.engine.backgroundState.PredictController.activeOrders = {
        'order-123': orderWithError,
      };

      // Mock sell to return a result with error
      mockSell.mockResolvedValue({
        success: false,
        error: 'Result error',
        id: 'order-123',
      });

      const { result } = renderHook(() => usePredictSell());

      await act(async () => {
        await result.current.placeSellOrder({
          position: mockPosition,
        });
      });

      expect(result.current.error).toBe('Result error');
    });
  });

  describe('hook stability', () => {
    it('returns stable function references', () => {
      const { result, rerender } = renderHook(() => usePredictSell());

      const initialPlaceOrder = result.current.placeSellOrder;
      const initialReset = result.current.reset;

      rerender({});

      expect(result.current.placeSellOrder).toBe(initialPlaceOrder);
      expect(result.current.reset).toBe(initialReset);
    });
  });

  describe('completed state', () => {
    it('returns true when currentOrder status is filled', async () => {
      const completedOrder = {
        id: 'order-123',
        providerId: 'provider-123',
        chainId: 1,
        outcomeId: 'outcome-456',
        outcomeTokenId: 'outcome-token-789',
        isBuy: false,
        amount: 50,
        price: 0.5,
        status: 'filled',
        timestamp: Date.now(),
        lastUpdated: Date.now(),
        onchainTradeParams: [],
      };

      mockState.engine.backgroundState.PredictController.activeOrders = {
        'order-123': completedOrder,
      };

      mockSell.mockResolvedValue({ success: true, id: 'order-123' });

      const { result } = renderHook(() => usePredictSell());

      await act(async () => {
        await result.current.placeSellOrder({
          position: mockPosition,
        });
      });

      expect(result.current.completed).toBe(true);
    });

    it('returns false when currentOrder is not present', () => {
      const { result } = renderHook(() => usePredictSell());

      expect(result.current.completed).toBe(false);
    });
  });
});
