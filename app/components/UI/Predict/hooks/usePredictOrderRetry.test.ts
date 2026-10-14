import { renderHook, act } from '@testing-library/react-hooks';
import { usePredictOrderRetry } from './usePredictOrderRetry';
import Engine from '../../../../core/Engine';
import type { PlaceOrderOutcome } from './usePredictPlaceOrder';
import { type OrderPreview, type PlaceOrderParams, Side } from '../types';

jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      trackPredictOrderEvent: jest.fn(),
    },
  },
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
    refetchPreview: jest
      .fn()
      .mockResolvedValue(createMockPreview({ sharePrice: 0.62 })),
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
    isSheetMode: false as boolean | undefined,
    attempt: undefined as PlaceOrderParams['attempt'],
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
    it('returns busy variant, not retrying, and no quote', () => {
      const params = createDefaultParams();
      const { result } = renderHook(() => usePredictOrderRetry(params));

      expect(result.current.retrySheetVariant).toBe('busy');
      expect(result.current.isRetrying).toBe(false);
      expect(result.current.retryQuote).toBeNull();
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

    it('fetches a fresh quote and moves to confirm on the not-filled edge', async () => {
      const freshPreview = createMockPreview({ sharePrice: 0.62 });
      const params = createDefaultParams({
        refetchPreview: jest.fn().mockResolvedValue(freshPreview),
      });
      const { result, rerender } = renderHook(() =>
        usePredictOrderRetry(params),
      );

      await act(async () => {
        params.isOrderNotFilled = true;
        rerender();
      });

      expect(params.refetchPreview).toHaveBeenCalledTimes(1);
      expect(result.current.retryQuote).toBe(freshPreview);
      expect(result.current.retrySheetVariant).toBe('confirm');
      expect(params.placeOrder).not.toHaveBeenCalled();
    });

    it('moves to quote_unavailable and submits nothing when the fetch fails', async () => {
      const params = createDefaultParams({
        refetchPreview: jest.fn().mockResolvedValue(null),
      });
      const { result, rerender } = renderHook(() =>
        usePredictOrderRetry(params),
      );

      await act(async () => {
        params.isOrderNotFilled = true;
        rerender();
      });

      expect(result.current.retrySheetVariant).toBe('quote_unavailable');
      expect(result.current.retryQuote).toBeNull();
      expect(params.placeOrder).not.toHaveBeenCalled();
    });

    it('does not auto-fetch or auto-open in sheet mode', async () => {
      const params = createDefaultParams({ isSheetMode: true });
      const { rerender } = renderHook(() => usePredictOrderRetry(params));

      await act(async () => {
        params.isOrderNotFilled = true;
        rerender();
      });

      expect(params.refetchPreview).not.toHaveBeenCalled();
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

    it('does not track retry status for a Predict buy', () => {
      const params = createDefaultParams({
        isOrderNotFilled: false,
        analyticsProperties: {
          marketId: 'market-123',
          transactionType: 'mm_predict_buy',
        },
      });
      const { rerender } = renderHook(() => usePredictOrderRetry(params));

      params.isOrderNotFilled = true;
      rerender();

      expect(mockTrackEvent).not.toHaveBeenCalled();
    });

    it('opens the retry sheet ref when isOrderNotFilled becomes true and isSheetMode is false', () => {
      const params = createDefaultParams({ isOrderNotFilled: false });
      const { result, rerender } = renderHook(() =>
        usePredictOrderRetry(params),
      );
      const onOpen = jest.fn();
      // simulate ref attached by the rendered sheet
      (
        result.current.retrySheetRef as unknown as {
          current: { onOpenBottomSheet: jest.Mock };
        }
      ).current = { onOpenBottomSheet: onOpen };

      params.isOrderNotFilled = true;
      rerender();

      expect(onOpen).toHaveBeenCalled();
    });

    it('skips opening the retry sheet ref when isSheetMode is true', () => {
      const params = createDefaultParams({
        isOrderNotFilled: false,
        isSheetMode: true,
      });
      const { result, rerender } = renderHook(() =>
        usePredictOrderRetry(params),
      );
      const onOpen = jest.fn();
      (
        result.current.retrySheetRef as unknown as {
          current: { onOpenBottomSheet: jest.Mock };
        }
      ).current = { onOpenBottomSheet: onOpen };

      params.isOrderNotFilled = true;
      rerender();

      expect(onOpen).not.toHaveBeenCalled();
    });
  });

  describe('handleRetry', () => {
    it('fetches a fresh quote and moves to confirm', async () => {
      const freshPreview = createMockPreview({ sharePrice: 0.62 });
      const params = createDefaultParams({
        // Sheet mode: the not-filled edge does not auto-fetch, the banner CTA
        // (handleRetry) drives the flow — matching a real user tap.
        isSheetMode: true,
        refetchPreview: jest.fn().mockResolvedValue(freshPreview),
      });
      const { result, rerender } = renderHook(() =>
        usePredictOrderRetry(params),
      );

      await act(async () => {
        params.isOrderNotFilled = true;
        rerender();
      });

      await act(async () => {
        await result.current.handleRetry();
      });

      expect(params.refetchPreview).toHaveBeenCalledTimes(1);
      expect(result.current.retryQuote).toBe(freshPreview);
      expect(result.current.retrySheetVariant).toBe('confirm');
      expect(params.placeOrder).not.toHaveBeenCalled();
    });

    it('always opens the sheet — even in sheet mode — because it is user-initiated', async () => {
      const params = createDefaultParams({
        isOrderNotFilled: true,
        isSheetMode: true,
      });
      const { result } = renderHook(() => usePredictOrderRetry(params));
      const onOpen = jest.fn();
      (
        result.current.retrySheetRef as unknown as {
          current: { onOpenBottomSheet: jest.Mock };
        }
      ).current = { onOpenBottomSheet: onOpen };

      await act(async () => {
        await result.current.handleRetry();
      });

      expect(onOpen).toHaveBeenCalled();
    });

    it('moves to quote_unavailable when the fresh fetch fails', async () => {
      const params = createDefaultParams({
        // Sheet mode: the not-filled edge does not auto-fetch, the banner CTA
        // (handleRetry) drives the flow — matching a real user tap.
        isSheetMode: true,
        refetchPreview: jest.fn().mockRejectedValue(new Error('network down')),
      });
      const { result, rerender } = renderHook(() =>
        usePredictOrderRetry(params),
      );

      await act(async () => {
        params.isOrderNotFilled = true;
        rerender();
      });

      await act(async () => {
        await result.current.handleRetry();
      });

      expect(result.current.retrySheetVariant).toBe('quote_unavailable');
      expect(result.current.retryQuote).toBeNull();
      expect(params.placeOrder).not.toHaveBeenCalled();
    });
  });

  describe('handleRetryConfirm', () => {
    it('submits the re-fetched quote, not the stale screen preview', async () => {
      const freshPreview = createMockPreview({ sharePrice: 0.62 });
      const params = createDefaultParams({
        refetchPreview: jest.fn().mockResolvedValue(freshPreview),
        preview: createMockPreview({ sharePrice: 0.51 }),
      });
      const { result, rerender } = renderHook(() =>
        usePredictOrderRetry(params),
      );

      await act(async () => {
        params.isOrderNotFilled = true;
        rerender();
      });

      await act(async () => {
        await result.current.handleRetryConfirm();
      });

      expect(params.placeOrder).toHaveBeenCalledWith(
        expect.objectContaining({ preview: freshPreview }),
      );
      expect(params.placeOrder.mock.calls[0][0].preview.sharePrice).toBe(0.62);
    });

    it('never applies 99% slippage on the confirmed retry', async () => {
      const freshPreview = createMockPreview({
        side: Side.SELL,
        slippage: 0.05,
      });
      const params = createDefaultParams({
        refetchPreview: jest.fn().mockResolvedValue(freshPreview),
      });
      const { result, rerender } = renderHook(() =>
        usePredictOrderRetry(params),
      );

      await act(async () => {
        params.isOrderNotFilled = true;
        rerender();
      });

      await act(async () => {
        await result.current.handleRetryConfirm();
      });

      const calledPreview = params.placeOrder.mock.calls[0][0].preview;
      expect(calledPreview.slippage).toBe(0.05);
      expect(calledPreview.slippage).not.toBe(0.99);
    });

    it('passes the same attempt to a confirmed retry', async () => {
      const attempt = {
        attemptId: 'attempt-1',
        amountUsd: 8,
        paymentMethod: 'predict_balance' as const,
      };
      const params = createDefaultParams({ attempt });
      const { result, rerender } = renderHook(() =>
        usePredictOrderRetry(params),
      );

      await act(async () => {
        params.isOrderNotFilled = true;
        rerender();
      });

      await act(async () => {
        await result.current.handleRetryConfirm();
      });

      expect(params.placeOrder).toHaveBeenCalledWith(
        expect.objectContaining({ attempt }),
      );
    });

    it('does nothing when there is no confirmed quote', async () => {
      const params = createDefaultParams();
      const { result } = renderHook(() => usePredictOrderRetry(params));

      await act(async () => {
        await result.current.handleRetryConfirm();
      });

      expect(params.placeOrder).not.toHaveBeenCalled();
    });

    it('calls resetOrderNotFilled on successful retry', async () => {
      const mockResetOrderNotFilled = jest.fn();
      const params = createDefaultParams({
        resetOrderNotFilled: mockResetOrderNotFilled,
      });
      const { result, rerender } = renderHook(() =>
        usePredictOrderRetry(params),
      );

      await act(async () => {
        params.isOrderNotFilled = true;
        rerender();
      });

      await act(async () => {
        await result.current.handleRetryConfirm();
      });

      expect(mockResetOrderNotFilled).toHaveBeenCalledTimes(1);
    });

    it('tracks RETRY_SUBMITTED event when the confirmed retry submits', async () => {
      const params = createDefaultParams();
      const { result, rerender } = renderHook(() =>
        usePredictOrderRetry(params),
      );

      await act(async () => {
        params.isOrderNotFilled = true;
        rerender();
      });

      await act(async () => {
        await result.current.handleRetryConfirm();
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'retry_submitted',
        }),
      );
    });

    it('sets variant to failed when the confirmed retry does not fill', async () => {
      const params = createDefaultParams({
        placeOrder: jest
          .fn()
          .mockResolvedValue({ status: 'order_not_filled' as const }),
      });
      const { result, rerender } = renderHook(() =>
        usePredictOrderRetry(params),
      );

      await act(async () => {
        params.isOrderNotFilled = true;
        rerender();
      });

      await act(async () => {
        await result.current.handleRetryConfirm();
      });

      expect(result.current.retrySheetVariant).toBe('failed');
    });

    it('sets variant to failed on unexpected exception', async () => {
      const params = createDefaultParams({
        placeOrder: jest.fn().mockRejectedValue(new Error('unexpected error')),
      });
      const { result, rerender } = renderHook(() =>
        usePredictOrderRetry(params),
      );

      await act(async () => {
        params.isOrderNotFilled = true;
        rerender();
      });

      await act(async () => {
        await result.current.handleRetryConfirm();
      });

      expect(result.current.retrySheetVariant).toBe('failed');
    });

    it('opens the retry sheet on retry failure when isSheetMode is false', async () => {
      const params = createDefaultParams({
        placeOrder: jest.fn().mockRejectedValue(new Error('unexpected error')),
      });
      const { result, rerender } = renderHook(() =>
        usePredictOrderRetry(params),
      );
      const onOpen = jest.fn();
      (
        result.current.retrySheetRef as unknown as {
          current: { onOpenBottomSheet: jest.Mock };
        }
      ).current = { onOpenBottomSheet: onOpen };

      await act(async () => {
        params.isOrderNotFilled = true;
        rerender();
      });

      onOpen.mockClear();
      await act(async () => {
        await result.current.handleRetryConfirm();
      });

      expect(onOpen).toHaveBeenCalledTimes(1);
    });

    it('does not open the retry sheet on retry failure when isSheetMode is true', async () => {
      const params = createDefaultParams({
        isSheetMode: true,
        placeOrder: jest.fn().mockRejectedValue(new Error('unexpected error')),
      });
      const { result, rerender } = renderHook(() =>
        usePredictOrderRetry(params),
      );
      const onOpen = jest.fn();
      (
        result.current.retrySheetRef as unknown as {
          current: { onOpenBottomSheet: jest.Mock };
        }
      ).current = { onOpenBottomSheet: onOpen };

      // Sheet mode: the banner CTA drives the fetch + confirm flow.
      await act(async () => {
        params.isOrderNotFilled = true;
        rerender();
      });

      await act(async () => {
        await result.current.handleRetry();
      });

      onOpen.mockClear();
      await act(async () => {
        await result.current.handleRetryConfirm();
      });

      expect(onOpen).not.toHaveBeenCalled();
      expect(result.current.retrySheetVariant).toBe('failed');
    });

    it('sets isRetrying to false after the retry completes', async () => {
      const params = createDefaultParams();
      const { result, rerender } = renderHook(() =>
        usePredictOrderRetry(params),
      );

      await act(async () => {
        params.isOrderNotFilled = true;
        rerender();
      });

      await act(async () => {
        await result.current.handleRetryConfirm();
      });

      expect(result.current.isRetrying).toBe(false);
    });

    it('does not require deposit confirmation flow when retry returns deposit_required', async () => {
      const mockResetOrderNotFilled = jest.fn();
      const params = createDefaultParams({
        placeOrder: jest
          .fn()
          .mockResolvedValue({ status: 'deposit_required' as const }),
        resetOrderNotFilled: mockResetOrderNotFilled,
      });
      const { result, rerender } = renderHook(() =>
        usePredictOrderRetry(params),
      );

      await act(async () => {
        params.isOrderNotFilled = true;
        rerender();
      });

      await act(async () => {
        await result.current.handleRetryConfirm();
      });

      expect(mockResetOrderNotFilled).toHaveBeenCalledTimes(1);
      expect(result.current.retrySheetVariant).toBe('confirm');
    });
  });
});
