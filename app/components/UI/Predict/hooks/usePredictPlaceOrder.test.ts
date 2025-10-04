import { renderHook, act } from '@testing-library/react-native';
import { ToastVariants } from '../../../../component-library/components/Toast';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import { usePredictTrading } from './usePredictTrading';
import { usePredictPlaceOrder } from './usePredictPlaceOrder';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { Result, Side } from '../types';
import { useContext } from 'react';

// Mock dependencies
jest.mock('../../../../component-library/components/Toast');
jest.mock('../../../../core/SDKConnect/utils/DevLogger');
jest.mock('./usePredictTrading');
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useContext: jest.fn(),
}));

const mockUseContext = useContext as jest.MockedFunction<typeof useContext>;
const mockUsePredictTrading = usePredictTrading as jest.MockedFunction<
  typeof usePredictTrading
>;
const mockDevLoggerLog = DevLogger.log as jest.MockedFunction<
  typeof DevLogger.log
>;
const mockToastRef = {
  current: {
    showToast: jest.fn(),
  },
};

describe('usePredictPlaceOrder', () => {
  const mockPlaceOrder = jest.fn();
  const mockGetPositions = jest.fn();
  const mockClaim = jest.fn();
  const mockCalculateBetAmounts = jest.fn();
  const mockCalculateCashOutAmounts = jest.fn();

  const mockOrderParams = {
    outcomeId: 'outcome-123',
    outcomeTokenId: 'token-456',
    side: Side.BUY,
    size: 100,
    providerId: 'polymarket',
  };

  const mockSuccessResult: Result<{ transactionHash: string }> = {
    success: true,
    response: { transactionHash: '0xabc123' },
  };

  const mockFailureResult: Result = {
    success: false,
    error: 'Order placement failed',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePredictTrading.mockReturnValue({
      placeOrder: mockPlaceOrder,
      getPositions: mockGetPositions,
      claim: mockClaim,
      calculateBetAmounts: mockCalculateBetAmounts,
      calculateCashOutAmounts: mockCalculateCashOutAmounts,
    });
    mockUseContext.mockReturnValue({ toastRef: mockToastRef });
  });

  describe('initial state', () => {
    it('returns initial state with no loading, error, or result', () => {
      const { result } = renderHook(() => usePredictPlaceOrder());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeUndefined();
      expect(result.current.result).toBeNull();
      expect(typeof result.current.placeOrder).toBe('function');
    });
  });

  describe('placeOrder - success scenario', () => {
    it('places order successfully and updates state', async () => {
      mockPlaceOrder.mockResolvedValue(mockSuccessResult);

      const { result } = renderHook(() => usePredictPlaceOrder());

      await act(async () => {
        await result.current.placeOrder(mockOrderParams);
      });

      expect(mockPlaceOrder).toHaveBeenCalledWith(mockOrderParams);
      expect(mockPlaceOrder).toHaveBeenCalledTimes(1);

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeUndefined();
      expect(result.current.result).toEqual(mockSuccessResult);
    });

    it('shows success toast when order is placed successfully', async () => {
      mockPlaceOrder.mockResolvedValue(mockSuccessResult);

      const { result } = renderHook(() => usePredictPlaceOrder());

      await act(async () => {
        await result.current.placeOrder(mockOrderParams);
      });

      expect(mockToastRef.current?.showToast).toHaveBeenCalledWith({
        variant: ToastVariants.Icon,
        iconName: IconName.Check,
        labelOptions: [{ label: 'Order placed' }],
        hasNoTimeout: false,
      });
    });

    it('calls onComplete callback when provided and order succeeds', async () => {
      mockPlaceOrder.mockResolvedValue(mockSuccessResult);
      const mockOnComplete = jest.fn();

      const { result } = renderHook(() =>
        usePredictPlaceOrder({ onComplete: mockOnComplete }),
      );

      await act(async () => {
        await result.current.placeOrder(mockOrderParams);
      });

      expect(mockOnComplete).toHaveBeenCalledWith(mockSuccessResult);
      expect(mockOnComplete).toHaveBeenCalledTimes(1);
    });

    it('logs order placement attempt and success', async () => {
      mockPlaceOrder.mockResolvedValue(mockSuccessResult);

      const { result } = renderHook(() => usePredictPlaceOrder());

      await act(async () => {
        await result.current.placeOrder(mockOrderParams);
      });

      expect(mockDevLoggerLog).toHaveBeenCalledWith(
        'usePredictPlaceOrder: Placing order',
        mockOrderParams,
      );
      expect(mockDevLoggerLog).toHaveBeenCalledWith(
        'usePredictPlaceOrder: Order placed successfully',
      );
    });

    it('sets loading to true during order placement', async () => {
      let resolvePromise: (value: Result<{ transactionHash: string }>) => void;
      const promise = new Promise<Result<{ transactionHash: string }>>(
        (resolve) => {
          resolvePromise = resolve;
        },
      );

      mockPlaceOrder.mockReturnValue(promise);

      const { result } = renderHook(() => usePredictPlaceOrder());

      act(() => {
        result.current.placeOrder(mockOrderParams);
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolvePromise(mockSuccessResult);
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('placeOrder - failure scenario', () => {
    it('handles order failure and updates error state', async () => {
      mockPlaceOrder.mockResolvedValue(mockFailureResult);

      const { result } = renderHook(() => usePredictPlaceOrder());

      await act(async () => {
        await result.current.placeOrder(mockOrderParams);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Order placement failed');
      expect(result.current.result).toBeNull();
    });

    it('shows failure toast when order placement fails', async () => {
      mockPlaceOrder.mockResolvedValue(mockFailureResult);

      const { result } = renderHook(() => usePredictPlaceOrder());

      await act(async () => {
        await result.current.placeOrder(mockOrderParams);
      });

      expect(mockToastRef.current?.showToast).toHaveBeenCalledWith({
        variant: ToastVariants.Icon,
        iconName: IconName.Loading,
        labelOptions: [{ label: 'Order failed' }],
        hasNoTimeout: false,
      });
    });

    it('calls onError callback when provided and order fails', async () => {
      mockPlaceOrder.mockResolvedValue(mockFailureResult);
      const mockOnError = jest.fn();

      const { result } = renderHook(() =>
        usePredictPlaceOrder({ onError: mockOnError }),
      );

      await act(async () => {
        await result.current.placeOrder(mockOrderParams);
      });

      expect(mockOnError).toHaveBeenCalledWith('Order placement failed');
      expect(mockOnError).toHaveBeenCalledTimes(1);
    });

    it('handles thrown errors from controller', async () => {
      const mockError = new Error('Network error');
      mockPlaceOrder.mockRejectedValue(mockError);

      const { result } = renderHook(() => usePredictPlaceOrder());

      await act(async () => {
        await result.current.placeOrder(mockOrderParams);
      });

      expect(result.current.error).toBe('Network error');
      expect(result.current.result).toBeNull();
    });

    it('provides default error message for non-Error thrown values', async () => {
      mockPlaceOrder.mockRejectedValue('String error');

      const { result } = renderHook(() => usePredictPlaceOrder());

      await act(async () => {
        await result.current.placeOrder(mockOrderParams);
      });

      expect(result.current.error).toBe('Failed to place order');
    });

    it('logs error details when order placement fails', async () => {
      const mockError = new Error('Controller error');
      mockPlaceOrder.mockRejectedValue(mockError);

      const { result } = renderHook(() => usePredictPlaceOrder());

      await act(async () => {
        await result.current.placeOrder(mockOrderParams);
      });

      expect(mockDevLoggerLog).toHaveBeenCalledWith(
        'usePredictPlaceOrder: Error placing order',
        {
          error: mockError,
          orderParams: mockOrderParams,
        },
      );
    });
  });

  describe('callback behavior', () => {
    it('does not call onComplete when not provided', async () => {
      mockPlaceOrder.mockResolvedValue(mockSuccessResult);
      const mockOnComplete = jest.fn();

      const { result } = renderHook(() => usePredictPlaceOrder());

      await act(async () => {
        await result.current.placeOrder(mockOrderParams);
      });

      expect(mockOnComplete).not.toHaveBeenCalled();
    });

    it('does not call onError when not provided', async () => {
      mockPlaceOrder.mockResolvedValue(mockFailureResult);
      const mockOnError = jest.fn();

      const { result } = renderHook(() => usePredictPlaceOrder());

      await act(async () => {
        await result.current.placeOrder(mockOrderParams);
      });

      expect(mockOnError).not.toHaveBeenCalled();
    });

    it('calls both onComplete and onError appropriately', async () => {
      const mockOnComplete = jest.fn();
      const mockOnError = jest.fn();

      // Test success
      mockPlaceOrder.mockResolvedValueOnce(mockSuccessResult);

      const { result, rerender } = renderHook(() =>
        usePredictPlaceOrder({
          onComplete: mockOnComplete,
          onError: mockOnError,
        }),
      );

      await act(async () => {
        await result.current.placeOrder(mockOrderParams);
      });

      expect(mockOnComplete).toHaveBeenCalledWith(mockSuccessResult);
      expect(mockOnError).not.toHaveBeenCalled();

      // Reset mocks
      mockOnComplete.mockClear();
      mockOnError.mockClear();

      // Test failure
      mockPlaceOrder.mockResolvedValueOnce(mockFailureResult);

      rerender({});

      await act(async () => {
        await result.current.placeOrder(mockOrderParams);
      });

      expect(mockOnError).toHaveBeenCalledWith('Order placement failed');
      expect(mockOnComplete).not.toHaveBeenCalled();
    });
  });

  describe('state management', () => {
    it('resets error state on successful order placement', async () => {
      // First fail an order
      mockPlaceOrder.mockResolvedValueOnce(mockFailureResult);

      const { result } = renderHook(() => usePredictPlaceOrder());

      await act(async () => {
        await result.current.placeOrder(mockOrderParams);
      });

      expect(result.current.error).toBe('Order placement failed');

      // Then succeed
      mockPlaceOrder.mockResolvedValueOnce(mockSuccessResult);

      await act(async () => {
        await result.current.placeOrder(mockOrderParams);
      });

      expect(result.current.error).toBeUndefined();
      expect(result.current.result).toEqual(mockSuccessResult);
    });

    it('maintains result state until next order placement', async () => {
      mockPlaceOrder.mockResolvedValue(mockSuccessResult);

      const { result } = renderHook(() => usePredictPlaceOrder());

      await act(async () => {
        await result.current.placeOrder(mockOrderParams);
      });

      expect(result.current.result).toEqual(mockSuccessResult);

      // Second call should maintain the result until completion
      await act(async () => {
        await result.current.placeOrder({ ...mockOrderParams, size: 200 });
      });

      expect(result.current.result).toEqual(mockSuccessResult);
    });
  });

  describe('hook stability', () => {
    it('returns stable function references across renders', () => {
      const { result, rerender } = renderHook(() => usePredictPlaceOrder());

      const initialPlaceOrder = result.current.placeOrder;

      rerender({});

      expect(result.current.placeOrder).toBe(initialPlaceOrder);
    });
  });
});
