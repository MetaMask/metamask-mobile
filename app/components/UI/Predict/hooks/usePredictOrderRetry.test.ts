import { renderHook, act } from '@testing-library/react-hooks';
import { usePredictOrderRetry } from './usePredictOrderRetry';
import Engine from '../../../../core/Engine';
import type { OrderPreview, PlaceOrderParams } from '../providers/types';
import type { PlaceOrderOutcome } from './usePredictPlaceOrder';
import { Side } from '../types';

jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      trackPredictOrderEvent: jest.fn(),
    },
  },
}));

jest.mock('../providers/polymarket/constants', () => ({
  SLIPPAGE_BEST_AVAILABLE: 0.99,
}));

jest.mock('../components/PredictOrderRetrySheet', () => ({}));

const mockTrackEvent = Engine.context.PredictController
  .trackPredictOrderEvent as jest.Mock;

function createMockPreview(overrides?: Partial<OrderPreview>): OrderPreview {
  return {
    marketId: 'market-123',
    outcomeId: 'outcome-123',
    outcomeTokenId: 'token-456',
    timestamp: Date.now(),
    side: Side.BUY,
    sharePrice: 0.51,
    maxAmountSpent: 8,
    minAmountReceived: 15.69,
    slippage: 0.03,
    tickSize: 0.01,
    minOrderSize: 0.01,
    negRisk: false,
    ...overrides,
  };
}

function createDefaultParams(
  overrides?: Partial<ReturnType<typeof createParamsObj>>,
) {
  return createParamsObj(overrides);
}

function createParamsObj(overrides?: Record<string, unknown>) {
  return {
    preview: createMockPreview() as OrderPreview | null | undefined,
    placeOrder: jest
      .fn()
      .mockResolvedValue(createSuccessOutcome()) as jest.Mock<
      Promise<PlaceOrderOutcome>
    >,
    analyticsProperties: {
      marketId: 'market-123',
    } as PlaceOrderParams['analyticsProperties'],
    isOrderNotFilled: false,
    resetOrderNotFilled: jest.fn(),
    ...overrides,
  };
}

function createSuccessOutcome(): PlaceOrderOutcome {
  return {
    status: 'success',
    result: {
      success: true,
      response: undefined,
    },
  };
}

describe('usePredictOrderRetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('returns busy variant and not retrying', () => {
      const params = createDefaultParams();
      const { result } = renderHook(() => usePredictOrderRetry(params));

      expect(result.current.retrySheetVariant).toBe('busy');
      expect(result.current.isRetrying).toBe(false);
    });

    it('returns a retrySheetRef', () => {
      const params = createDefaultParams();
      const { result } = renderHook(() => usePredictOrderRetry(params));

      expect(result.current.retrySheetRef).toBeDefined();
    });
  });

  describe('order not filled effect', () => {
    it('tracks RETRY_PROMPTED event when isOrderNotFilled becomes true', () => {
      const params = createDefaultParams({ isOrderNotFilled: false });
      const { rerender } = renderHook(() => usePredictOrderRetry(params));

      params.isOrderNotFilled = true;
      rerender();

      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'retry_prompted',
        }),
      );
    });

    it('sets variant to busy when isOrderNotFilled becomes true', () => {
      const params = createDefaultParams({ isOrderNotFilled: true });
      const { result } = renderHook(() => usePredictOrderRetry(params));

      expect(result.current.retrySheetVariant).toBe('busy');
    });

    it('tracks RETRY_PROMPTED only once per not-filled transition', () => {
      const params = createDefaultParams({
        isOrderNotFilled: true,
        preview: createMockPreview({ sharePrice: 0.51 }),
      });
      const { rerender } = renderHook(() => usePredictOrderRetry(params));

      params.preview = createMockPreview({ sharePrice: 0.62 });
      rerender();

      const promptedCalls = mockTrackEvent.mock.calls.filter(
        ([event]) => event?.status === 'retry_prompted',
      );
      expect(promptedCalls).toHaveLength(1);
    });
  });

  describe('handleRetryWithBestPrice', () => {
    it('calls placeOrder with SLIPPAGE_BEST_AVAILABLE on retry', async () => {
      const mockPlaceOrder = jest
        .fn()
        .mockResolvedValue(createSuccessOutcome());
      const params = createDefaultParams({ placeOrder: mockPlaceOrder });
      const { result } = renderHook(() => usePredictOrderRetry(params));

      await act(async () => {
        await result.current.handleRetryWithBestPrice();
      });

      expect(mockPlaceOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          preview: expect.objectContaining({ slippage: 0.99 }),
        }),
      );
    });

    it('calls resetOrderNotFilled on successful retry', async () => {
      const mockResetOrderNotFilled = jest.fn();
      const mockPlaceOrder = jest
        .fn()
        .mockResolvedValue(createSuccessOutcome());
      const params = createDefaultParams({
        placeOrder: mockPlaceOrder,
        resetOrderNotFilled: mockResetOrderNotFilled,
      });
      const { result } = renderHook(() => usePredictOrderRetry(params));

      await act(async () => {
        await result.current.handleRetryWithBestPrice();
      });

      expect(mockResetOrderNotFilled).toHaveBeenCalledTimes(1);
    });

    it('tracks RETRY_SUBMITTED event on retry attempt', async () => {
      const mockPlaceOrder = jest
        .fn()
        .mockResolvedValue(createSuccessOutcome());
      const params = createDefaultParams({ placeOrder: mockPlaceOrder });
      const { result } = renderHook(() => usePredictOrderRetry(params));

      await act(async () => {
        await result.current.handleRetryWithBestPrice();
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'retry_submitted',
        }),
      );
    });

    it('sets variant to failed when retry returns order_not_filled', async () => {
      const mockPlaceOrder = jest
        .fn()
        .mockResolvedValue({ status: 'order_not_filled' as const });
      const params = createDefaultParams({ placeOrder: mockPlaceOrder });
      const { result } = renderHook(() => usePredictOrderRetry(params));

      await act(async () => {
        await result.current.handleRetryWithBestPrice();
      });

      expect(result.current.retrySheetVariant).toBe('failed');
    });

    it('sets variant to failed when retry returns error', async () => {
      const mockPlaceOrder = jest.fn().mockResolvedValue({
        status: 'error' as const,
        error: 'Failed to place order',
      });
      const params = createDefaultParams({ placeOrder: mockPlaceOrder });
      const { result } = renderHook(() => usePredictOrderRetry(params));

      await act(async () => {
        await result.current.handleRetryWithBestPrice();
      });

      expect(result.current.retrySheetVariant).toBe('failed');
    });

    it('does not set variant to failed when retry requires deposit', async () => {
      const mockPlaceOrder = jest
        .fn()
        .mockResolvedValue({ status: 'deposit_required' as const });
      const params = createDefaultParams({ placeOrder: mockPlaceOrder });
      const { result } = renderHook(() => usePredictOrderRetry(params));

      await act(async () => {
        await result.current.handleRetryWithBestPrice();
      });

      expect(result.current.retrySheetVariant).toBe('busy');
    });

    it('sets isRetrying to false after retry completes', async () => {
      const mockPlaceOrder = jest
        .fn()
        .mockResolvedValue(createSuccessOutcome());
      const params = createDefaultParams({ placeOrder: mockPlaceOrder });
      const { result } = renderHook(() => usePredictOrderRetry(params));

      await act(async () => {
        await result.current.handleRetryWithBestPrice();
      });

      expect(result.current.isRetrying).toBe(false);
    });

    it('sets isRetrying to false after retry fails', async () => {
      const mockPlaceOrder = jest
        .fn()
        .mockResolvedValue({ status: 'order_not_filled' as const });
      const params = createDefaultParams({ placeOrder: mockPlaceOrder });
      const { result } = renderHook(() => usePredictOrderRetry(params));

      await act(async () => {
        await result.current.handleRetryWithBestPrice();
      });

      expect(result.current.isRetrying).toBe(false);
    });

    it('sets variant to failed on unexpected exception', async () => {
      const mockPlaceOrder = jest
        .fn()
        .mockRejectedValue(new Error('unexpected error'));
      const params = createDefaultParams({ placeOrder: mockPlaceOrder });
      const { result } = renderHook(() => usePredictOrderRetry(params));

      await act(async () => {
        await result.current.handleRetryWithBestPrice();
      });

      expect(result.current.retrySheetVariant).toBe('failed');
    });

    it('does not call placeOrder when preview is null', async () => {
      const mockPlaceOrder = jest.fn();
      const params = createDefaultParams({
        placeOrder: mockPlaceOrder,
        preview: null,
      });
      const { result } = renderHook(() => usePredictOrderRetry(params));

      await act(async () => {
        await result.current.handleRetryWithBestPrice();
      });

      expect(mockPlaceOrder).not.toHaveBeenCalled();
    });

    it('does not call placeOrder when preview is undefined', async () => {
      const mockPlaceOrder = jest.fn();
      const params = createDefaultParams({
        placeOrder: mockPlaceOrder,
        preview: undefined,
      });
      const { result } = renderHook(() => usePredictOrderRetry(params));

      await act(async () => {
        await result.current.handleRetryWithBestPrice();
      });

      expect(mockPlaceOrder).not.toHaveBeenCalled();
    });

    it('preserves original preview fields except slippage', async () => {
      const mockPlaceOrder = jest
        .fn()
        .mockResolvedValue(createSuccessOutcome());
      const preview = createMockPreview({
        sharePrice: 0.75,
        maxAmountSpent: 20,
        minAmountReceived: 26.67,
      });
      const params = createDefaultParams({
        placeOrder: mockPlaceOrder,
        preview,
      });
      const { result } = renderHook(() => usePredictOrderRetry(params));

      await act(async () => {
        await result.current.handleRetryWithBestPrice();
      });

      const calledPreview = mockPlaceOrder.mock.calls[0][0].preview;
      expect(calledPreview.sharePrice).toBe(0.75);
      expect(calledPreview.maxAmountSpent).toBe(20);
      expect(calledPreview.minAmountReceived).toBe(26.67);
      expect(calledPreview.slippage).toBe(0.99);
    });
  });
});
