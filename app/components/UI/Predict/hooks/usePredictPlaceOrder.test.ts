import { act, renderHook } from '@testing-library/react-native';
import { useContext } from 'react';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { ToastVariants } from '../../../../component-library/components/Toast';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import type { OrderPreview } from '../providers/types';
import { Result, Side } from '../types';
import { usePredictPlaceOrder } from './usePredictPlaceOrder';
import { usePredictTrading } from './usePredictTrading';
import { usePredictBalance } from './usePredictBalance';

// Mock dependencies
jest.mock('../../../../component-library/components/Toast');
jest.mock('../../../../core/SDKConnect/utils/DevLogger');
jest.mock('./usePredictTrading');
jest.mock('./usePredictBalance');
jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string, options?: Record<string, unknown>) => {
    const translations: Record<string, string> = {
      'predict.order.placing_prediction': 'Placing a prediction',
      'predict.order.prediction_placed': 'Prediction placed',
      'predict.order.cashed_out': 'Cashed out',
      'predict.order.cashed_out_subtitle': `${
        options?.amount || '0'
      } added to your balance`,
      'predict.order.cashing_out': `Cashing out ${options?.amount || '0'}`,
      'predict.order.cashing_out_subtitle': `Estimated ${
        options?.time || 5
      } seconds`,
      'predict.order.order_failed': 'Order failed',
    };
    return translations[key] || key;
  },
}));
jest.mock('../utils/format', () => ({
  formatPrice: (value: number) => value.toFixed(2),
}));
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useContext: jest.fn(),
}));

const mockUseContext = useContext as jest.MockedFunction<typeof useContext>;
const mockUsePredictTrading = usePredictTrading as jest.MockedFunction<
  typeof usePredictTrading
>;
const mockUsePredictBalance = usePredictBalance as jest.MockedFunction<
  typeof usePredictBalance
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
  const mockGetBalance = jest.fn();

  function createMockOrderPreview(
    overrides?: Partial<OrderPreview>,
  ): OrderPreview {
    return {
      marketId: 'market-123',
      outcomeId: 'outcome-123',
      outcomeTokenId: 'token-456',
      timestamp: Date.now(),
      side: Side.BUY,
      sharePrice: 0.5,
      maxAmountSpent: 100,
      minAmountReceived: 200,
      slippage: 0.005,
      tickSize: 0.01,
      minOrderSize: 0.01,
      negRisk: false,
      ...overrides,
    };
  }

  const mockOrderParams = {
    providerId: 'polymarket',
    preview: createMockOrderPreview(),
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
      getBalance: mockGetBalance,
      previewOrder: jest.fn(),
      prepareWithdraw: jest.fn(),
    });
    mockUsePredictBalance.mockReturnValue({
      balance: 1000,
      isLoading: false,
      isRefreshing: false,
      error: null,
      hasNoBalance: false,
      loadBalance: jest.fn(),
    });
    mockUseContext.mockReturnValue({ toastRef: mockToastRef });
  });

  afterEach(() => {
    jest.clearAllMocks();
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

    it('shows success toast when BUY order is placed successfully', async () => {
      mockPlaceOrder.mockResolvedValue(mockSuccessResult);

      const { result } = renderHook(() => usePredictPlaceOrder());

      await act(async () => {
        await result.current.placeOrder(mockOrderParams);
      });

      expect(mockToastRef.current?.showToast).toHaveBeenCalledTimes(2);

      // First call - loading toast
      expect(mockToastRef.current?.showToast).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          variant: ToastVariants.Icon,
          iconName: IconName.Loading,
          labelOptions: [{ label: 'Placing a prediction' }],
          hasNoTimeout: false,
        }),
      );

      // Second call - success toast
      expect(mockToastRef.current?.showToast).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          variant: ToastVariants.Icon,
          iconName: IconName.Check,
          labelOptions: expect.arrayContaining([
            expect.objectContaining({
              label: expect.stringContaining('Prediction placed'),
              isBold: true,
            }),
          ]),
          hasNoTimeout: false,
        }),
      );
    });

    it('shows cashed out toast when SELL order is placed successfully', async () => {
      jest.useFakeTimers();
      mockPlaceOrder.mockResolvedValue(mockSuccessResult);

      const sellOrderParams = {
        ...mockOrderParams,
        preview: createMockOrderPreview({
          side: Side.SELL,
          minAmountReceived: 150,
        }),
      };

      const { result } = renderHook(() => usePredictPlaceOrder());

      await act(async () => {
        await result.current.placeOrder(sellOrderParams);
      });

      expect(mockToastRef.current?.showToast).toHaveBeenCalledTimes(1);

      // First call - loading toast
      expect(mockToastRef.current?.showToast).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          variant: ToastVariants.Icon,
          iconName: IconName.Loading,
          labelOptions: expect.arrayContaining([
            expect.objectContaining({
              label: expect.stringContaining('Cashing out'),
              isBold: true,
            }),
          ]),
          hasNoTimeout: false,
        }),
      );

      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      expect(mockToastRef.current?.showToast).toHaveBeenCalledTimes(2);

      // Second call - success toast (after delay)
      expect(mockToastRef.current?.showToast).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          variant: ToastVariants.Icon,
          iconName: IconName.Check,
          labelOptions: expect.arrayContaining([
            expect.objectContaining({
              label: expect.stringContaining('Cashed out'),
              isBold: true,
            }),
          ]),
          hasNoTimeout: false,
        }),
      );

      jest.useRealTimers();
    });

    it('reloads balance after successful order placement', async () => {
      mockPlaceOrder.mockResolvedValue(mockSuccessResult);
      const mockLoadBalance = jest.fn();
      mockUsePredictBalance.mockReturnValue({
        balance: 1000,
        isLoading: false,
        isRefreshing: false,
        error: null,
        hasNoBalance: false,
        loadBalance: mockLoadBalance,
      });

      const { result } = renderHook(() => usePredictPlaceOrder());

      await act(async () => {
        await result.current.placeOrder(mockOrderParams);
      });

      expect(mockLoadBalance).toHaveBeenCalledWith({ isRefresh: true });
      expect(mockLoadBalance).toHaveBeenCalledTimes(1);
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

      expect(mockToastRef.current?.showToast).toHaveBeenCalledTimes(2);

      // First call - loading toast
      expect(mockToastRef.current?.showToast).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          variant: ToastVariants.Icon,
          iconName: IconName.Loading,
          hasNoTimeout: false,
        }),
      );

      // Second call - failure toast
      expect(mockToastRef.current?.showToast).toHaveBeenNthCalledWith(2, {
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
        const updatedPreview = createMockOrderPreview({ maxAmountSpent: 200 });
        await result.current.placeOrder({
          providerId: 'polymarket',
          preview: updatedPreview,
        });
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
