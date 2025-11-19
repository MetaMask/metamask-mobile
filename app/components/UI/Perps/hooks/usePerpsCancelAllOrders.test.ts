import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import { usePerpsCancelAllOrders } from './usePerpsCancelAllOrders';
import Engine from '../../../../core/Engine';
import type { Order } from '../controllers/types';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({
    goBack: jest.fn(),
    navigate: jest.fn(),
  })),
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      cancelOrders: jest.fn(),
    },
  },
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, params?: Record<string, unknown>) => {
    if (key === 'perps.cancel_all_modal.error_message' && params?.count) {
      return `Failed to cancel ${params.count} orders`;
    }
    return key;
  }),
}));

const createMockOrder = (overrides: Partial<Order> = {}): Order => ({
  orderId: 'order-1',
  symbol: 'BTC',
  side: 'buy',
  orderType: 'limit',
  size: '0.1',
  originalSize: '0.1',
  price: '50000',
  filledSize: '0',
  remainingSize: '0.1',
  status: 'open',
  timestamp: Date.now(),
  ...overrides,
});

describe('usePerpsCancelAllOrders', () => {
  const mockNavigation = {
    goBack: jest.fn(),
    navigate: jest.fn(),
    canGoBack: jest.fn(() => true),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue(mockNavigation);
  });

  it('initializes with correct default state', () => {
    // Arrange
    const orders = [createMockOrder(), createMockOrder({ orderId: 'order-2' })];

    // Act
    const { result } = renderHook(() => usePerpsCancelAllOrders(orders));

    // Assert
    expect(result.current.isCanceling).toBe(false);
    expect(result.current.orderCount).toBe(2);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.handleCancelAll).toBe('function');
    expect(typeof result.current.handleKeepOrders).toBe('function');
  });

  it('handles empty orders array', () => {
    // Arrange & Act
    const { result } = renderHook(() => usePerpsCancelAllOrders([]));

    // Assert
    expect(result.current.orderCount).toBe(0);
  });

  it('handles null orders', () => {
    // Arrange & Act
    const { result } = renderHook(() => usePerpsCancelAllOrders(null));

    // Assert
    expect(result.current.orderCount).toBe(0);
  });

  it('cancels all orders successfully', async () => {
    // Arrange
    const orders = [createMockOrder(), createMockOrder({ orderId: 'order-2' })];
    const mockResult = {
      success: true,
      successCount: 2,
      failureCount: 0,
      results: [],
    };
    (
      Engine.context.PerpsController.cancelOrders as jest.Mock
    ).mockResolvedValue(mockResult);
    const { result } = renderHook(() => usePerpsCancelAllOrders(orders));

    // Act
    await act(async () => {
      await result.current.handleCancelAll();
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isCanceling).toBe(false);
    });
    expect(Engine.context.PerpsController.cancelOrders).toHaveBeenCalledWith({
      cancelAll: true,
    });
    expect(mockNavigation.goBack).toHaveBeenCalled();
    expect(result.current.error).toBeNull();
  });

  it('handles partial success (some orders cancel, some fail)', async () => {
    // Arrange
    const orders = [createMockOrder(), createMockOrder({ orderId: 'order-2' })];
    const mockResult = {
      success: false,
      successCount: 1,
      failureCount: 1,
      results: [],
    };
    (
      Engine.context.PerpsController.cancelOrders as jest.Mock
    ).mockResolvedValue(mockResult);
    const { result } = renderHook(() => usePerpsCancelAllOrders(orders));

    // Act
    await act(async () => {
      await result.current.handleCancelAll();
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isCanceling).toBe(false);
    });
    expect(mockNavigation.goBack).toHaveBeenCalled();
    expect(result.current.error).toBeNull();
  });

  it('handles complete failure (all orders fail)', async () => {
    // Arrange
    const orders = [createMockOrder(), createMockOrder({ orderId: 'order-2' })];
    const mockResult = {
      success: false,
      successCount: 0,
      failureCount: 2,
      results: [],
    };
    (
      Engine.context.PerpsController.cancelOrders as jest.Mock
    ).mockResolvedValue(mockResult);
    const { result } = renderHook(() => usePerpsCancelAllOrders(orders));

    // Act
    await act(async () => {
      await result.current.handleCancelAll();
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isCanceling).toBe(false);
    });
    expect(mockNavigation.goBack).not.toHaveBeenCalled();
    expect(result.current.error).not.toBeNull();
    expect(result.current.error?.message).toContain(
      'Failed to cancel 2 orders',
    );
  });

  it('handles network errors', async () => {
    // Arrange
    const orders = [createMockOrder()];
    const networkError = new Error('Network request failed');
    (
      Engine.context.PerpsController.cancelOrders as jest.Mock
    ).mockRejectedValue(networkError);
    const { result } = renderHook(() => usePerpsCancelAllOrders(orders));

    // Act
    await act(async () => {
      await result.current.handleCancelAll();
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isCanceling).toBe(false);
    });
    expect(result.current.error).toEqual(networkError);
    expect(mockNavigation.goBack).not.toHaveBeenCalled();
  });

  it('manages loading state correctly', async () => {
    // Arrange
    const orders = [createMockOrder()];
    let resolveCancel: (value: unknown) => void;
    const cancelPromise = new Promise((resolve) => {
      resolveCancel = resolve;
    });
    (Engine.context.PerpsController.cancelOrders as jest.Mock).mockReturnValue(
      cancelPromise,
    );
    const { result } = renderHook(() => usePerpsCancelAllOrders(orders));

    // Act - Start canceling
    act(() => {
      result.current.handleCancelAll();
    });

    // Assert - Should be canceling
    await waitFor(() => {
      expect(result.current.isCanceling).toBe(true);
    });

    // Act - Resolve the promise
    await act(async () => {
      resolveCancel({
        success: true,
        successCount: 1,
        failureCount: 0,
        results: [],
      });
      await cancelPromise;
    });

    // Assert - Should no longer be canceling
    await waitFor(() => {
      expect(result.current.isCanceling).toBe(false);
    });
  });

  it('invokes onSuccess callback when provided', async () => {
    // Arrange
    const orders = [createMockOrder()];
    const mockResult = {
      success: true,
      successCount: 1,
      failureCount: 0,
      results: [],
    };
    (
      Engine.context.PerpsController.cancelOrders as jest.Mock
    ).mockResolvedValue(mockResult);
    const onSuccess = jest.fn();
    const { result } = renderHook(() =>
      usePerpsCancelAllOrders(orders, { onSuccess }),
    );

    // Act
    await act(async () => {
      await result.current.handleCancelAll();
    });

    // Assert
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(mockResult);
    });
  });

  it('invokes onError callback when provided', async () => {
    // Arrange
    const orders = [createMockOrder()];
    const error = new Error('Cancel failed');
    (
      Engine.context.PerpsController.cancelOrders as jest.Mock
    ).mockRejectedValue(error);
    const onError = jest.fn();
    const { result } = renderHook(() =>
      usePerpsCancelAllOrders(orders, { onError }),
    );

    // Act
    await act(async () => {
      await result.current.handleCancelAll();
    });

    // Assert
    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(error);
    });
  });

  it('does not navigate back when navigateBackOnSuccess is false', async () => {
    // Arrange
    const orders = [createMockOrder()];
    const mockResult = {
      success: true,
      successCount: 1,
      failureCount: 0,
      results: [],
    };
    (
      Engine.context.PerpsController.cancelOrders as jest.Mock
    ).mockResolvedValue(mockResult);
    const { result } = renderHook(() =>
      usePerpsCancelAllOrders(orders, { navigateBackOnSuccess: false }),
    );

    // Act
    await act(async () => {
      await result.current.handleCancelAll();
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isCanceling).toBe(false);
    });
    expect(mockNavigation.goBack).not.toHaveBeenCalled();
  });

  it('handles keepOrders action', () => {
    // Arrange
    const orders = [createMockOrder()];
    const { result } = renderHook(() => usePerpsCancelAllOrders(orders));

    // Act
    act(() => {
      result.current.handleKeepOrders();
    });

    // Assert
    expect(mockNavigation.goBack).toHaveBeenCalled();
  });

  it('does nothing when handleCancelAll called with no orders', async () => {
    // Arrange
    const { result } = renderHook(() => usePerpsCancelAllOrders(null));

    // Act
    await act(async () => {
      await result.current.handleCancelAll();
    });

    // Assert
    expect(Engine.context.PerpsController.cancelOrders).not.toHaveBeenCalled();
    expect(result.current.isCanceling).toBe(false);
  });

  it('clears error state on subsequent successful cancel', async () => {
    // Arrange
    const orders = [createMockOrder()];
    const error = new Error('First cancel failed');
    (Engine.context.PerpsController.cancelOrders as jest.Mock)
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce({
        success: true,
        successCount: 1,
        failureCount: 0,
        results: [],
      });
    const { result } = renderHook(() => usePerpsCancelAllOrders(orders));

    // Act - First cancel fails
    await act(async () => {
      await result.current.handleCancelAll();
    });

    // Assert - Error is set
    await waitFor(() => {
      expect(result.current.error).toEqual(error);
    });

    // Act - Second cancel succeeds
    await act(async () => {
      await result.current.handleCancelAll();
    });

    // Assert - Error is cleared
    await waitFor(() => {
      expect(result.current.error).toBeNull();
    });
  });
});
