import { renderHook, act } from '@testing-library/react-hooks';
import { usePredictOrderRetry } from './usePredictOrderRetry';
import Engine from '../../../../core/Engine';
import type { PlaceOrderOutcome } from './usePredictPlaceOrder';
import {
  type OrderPreview,
  type PlaceOrderParams,
  type PredictRetryOrderState,
  Side,
} from '../types';

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
    refetchPreview: jest.fn().mockResolvedValue({
      status: 'ok' as const,
      preview: createMockPreview({ sharePrice: 0.62 }),
    }),
    lastSubmittedPreview: undefined as OrderPreview | null | undefined,
    orderState: undefined as PredictRetryOrderState | undefined,
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
        refetchPreview: jest.fn().mockResolvedValue({
          status: 'ok' as const,
          preview: freshPreview,
        }),
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
        refetchPreview: jest.fn().mockResolvedValue({ status: 'unavailable' }),
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

    it('clears the quote and does not submit once the episode ends', async () => {
      const params = createDefaultParams();
      const { result, rerender } = renderHook(() =>
        usePredictOrderRetry(params),
      );

      await act(async () => {
        params.isOrderNotFilled = true;
        rerender();
      });

      expect(result.current.retryQuote).not.toBeNull();

      await act(async () => {
        params.isOrderNotFilled = false;
        rerender();
      });

      // A stale quote must not remain confirmable after the episode ends.
      expect(result.current.retryQuote).toBeNull();

      await act(async () => {
        await result.current.handleRetryConfirm();
      });

      expect(params.placeOrder).not.toHaveBeenCalled();
    });

    it('restarts the retry count on the next episode', async () => {
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
        expect.objectContaining({ status: 'retry_completed', retryCount: 1 }),
      );

      // Episode over — the count resets so the next not-filled failure
      // starts from one again.
      await act(async () => {
        params.isOrderNotFilled = false;
        rerender();
      });

      await act(async () => {
        params.isOrderNotFilled = true;
        rerender();
      });

      mockTrackEvent.mockClear();

      await act(async () => {
        await result.current.handleRetryConfirm();
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'retry_submitted', retryCount: 1 }),
      );
      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'retry_completed', retryCount: 1 }),
      );
    });
  });

  describe('handleRetry', () => {
    it('fetches a fresh quote and moves to confirm', async () => {
      const freshPreview = createMockPreview({ sharePrice: 0.62 });
      const params = createDefaultParams({
        // Sheet mode: the not-filled edge does not auto-fetch, the banner CTA
        // (handleRetry) drives the flow — matching a real user tap.
        isSheetMode: true,
        refetchPreview: jest.fn().mockResolvedValue({
          status: 'ok' as const,
          preview: freshPreview,
        }),
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

    it('ignores the fresh quote when the episode is dismissed mid-fetch', async () => {
      let resolveFetch!: (value: unknown) => void;
      const params = createDefaultParams({
        // Sheet mode: the not-filled edge does not auto-fetch, the banner CTA
        // (handleRetry) drives the flow — matching a real user tap.
        isSheetMode: true,
        refetchPreview: jest.fn().mockImplementation(
          () =>
            new Promise((resolve) => {
              resolveFetch = resolve;
            }),
        ),
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

      let inFlight: Promise<void> | undefined;
      await act(async () => {
        inFlight = result.current.handleRetry();
      });

      // The user dismisses the episode while the fetch is still in flight.
      await act(async () => {
        params.isOrderNotFilled = false;
        rerender();
      });

      await act(async () => {
        resolveFetch({
          status: 'ok',
          preview: createMockPreview({ sharePrice: 0.62 }),
        });
        await inFlight;
      });

      // A dismissed episode must not have a quote surfaced for it after the
      // fetch resolves: it could then be confirmed and submitted.
      expect(result.current.retryQuote).toBeNull();
      expect(result.current.retrySheetVariant).toBe('busy');
      expect(params.placeOrder).not.toHaveBeenCalled();
      expect(onOpen).not.toHaveBeenCalled();
    });

    it.each(['pending', 'filled', 'canceled'] as const)(
      'ignores the fresh quote when the order becomes %s mid-fetch',
      async (orderState) => {
        let resolveFetch!: (value: unknown) => void;
        const params = createDefaultParams({
          isSheetMode: true,
          refetchPreview: jest.fn().mockImplementation(
            () =>
              new Promise((resolve) => {
                resolveFetch = resolve;
              }),
          ),
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

        let inFlight: Promise<void> | undefined;
        await act(async () => {
          inFlight = result.current.handleRetry();
        });

        // The order resolves while the fetch is still in flight.
        await act(async () => {
          params.orderState = orderState;
          rerender();
        });

        await act(async () => {
          resolveFetch({
            status: 'ok',
            preview: createMockPreview({ sharePrice: 0.62 }),
          });
          await inFlight;
        });

        // A terminal/in-flight order must never be retried as a fresh
        // failure: the post-fetch guard has to catch the transition.
        expect(result.current.retryQuote).toBeNull();
        expect(result.current.retrySheetVariant).toBe('busy');
        expect(params.placeOrder).not.toHaveBeenCalled();
        expect(onOpen).not.toHaveBeenCalled();
      },
    );
  });

  describe('1-tick honesty', () => {
    it('moves to confirm when the fresh price is at most 1 tick worse', async () => {
      // SELL: 0.65 -> 0.64 is exactly 1 tick worse — single confirmation.
      const params = createDefaultParams({
        lastSubmittedPreview: createMockPreview({
          side: Side.SELL,
          sharePrice: 0.65,
          slippage: 0.05,
        }),
        refetchPreview: jest.fn().mockResolvedValue({
          status: 'ok' as const,
          preview: createMockPreview({
            side: Side.SELL,
            sharePrice: 0.64,
            slippage: 0.05,
          }),
        }),
      });
      const { result, rerender } = renderHook(() =>
        usePredictOrderRetry(params),
      );

      await act(async () => {
        params.isOrderNotFilled = true;
        rerender();
      });

      expect(result.current.retrySheetVariant).toBe('confirm');
      expect(result.current.retryPreviousPrice).toBe(0.65);
    });

    it('moves to price_moved when the fresh price is more than 1 tick worse', async () => {
      // SELL: 0.65 -> 0.62 is 3 ticks worse — explicit re-confirmation.
      const params = createDefaultParams({
        lastSubmittedPreview: createMockPreview({
          side: Side.SELL,
          sharePrice: 0.65,
          slippage: 0.05,
        }),
        refetchPreview: jest.fn().mockResolvedValue({
          status: 'ok' as const,
          preview: createMockPreview({
            side: Side.SELL,
            sharePrice: 0.62,
            slippage: 0.05,
          }),
        }),
      });
      const { result, rerender } = renderHook(() =>
        usePredictOrderRetry(params),
      );

      await act(async () => {
        params.isOrderNotFilled = true;
        rerender();
      });

      expect(result.current.retrySheetVariant).toBe('price_moved');
      expect(result.current.retryPreviousPrice).toBe(0.65);
      expect(params.placeOrder).not.toHaveBeenCalled();
    });

    it('moves to confirm when the fresh price is better', async () => {
      // SELL: 0.65 -> 0.68 is a better price — no extra step.
      const params = createDefaultParams({
        lastSubmittedPreview: createMockPreview({
          side: Side.SELL,
          sharePrice: 0.65,
          slippage: 0.05,
        }),
        refetchPreview: jest.fn().mockResolvedValue({
          status: 'ok' as const,
          preview: createMockPreview({
            side: Side.SELL,
            sharePrice: 0.68,
            slippage: 0.05,
          }),
        }),
      });
      const { result, rerender } = renderHook(() =>
        usePredictOrderRetry(params),
      );

      await act(async () => {
        params.isOrderNotFilled = true;
        rerender();
      });

      expect(result.current.retrySheetVariant).toBe('confirm');
    });

    it('treats a higher price as worse for buys', async () => {
      // BUY: 0.60 -> 0.63 pays more per share — 3 ticks worse.
      const params = createDefaultParams({
        lastSubmittedPreview: createMockPreview({
          side: Side.BUY,
          sharePrice: 0.6,
          slippage: 0.03,
        }),
        refetchPreview: jest.fn().mockResolvedValue({
          status: 'ok' as const,
          preview: createMockPreview({
            side: Side.BUY,
            sharePrice: 0.63,
            slippage: 0.03,
          }),
        }),
      });
      const { result, rerender } = renderHook(() =>
        usePredictOrderRetry(params),
      );

      await act(async () => {
        params.isOrderNotFilled = true;
        rerender();
      });

      expect(result.current.retrySheetVariant).toBe('price_moved');
    });

    it('measures ticks with the preview tick size, not a hardcoded cent', async () => {
      // Finer book (tick 0.001): 0.100 -> 0.098 is 2 ticks worse — a
      // hardcoded $0.01 would wrongly read this as an unmoved price.
      const params = createDefaultParams({
        lastSubmittedPreview: createMockPreview({
          side: Side.SELL,
          sharePrice: 0.1,
          tickSize: 0.001,
          slippage: 0.05,
        }),
        refetchPreview: jest.fn().mockResolvedValue({
          status: 'ok' as const,
          preview: createMockPreview({
            side: Side.SELL,
            sharePrice: 0.098,
            tickSize: 0.001,
            slippage: 0.05,
          }),
        }),
      });
      const { result, rerender } = renderHook(() =>
        usePredictOrderRetry(params),
      );

      await act(async () => {
        params.isOrderNotFilled = true;
        rerender();
      });

      expect(result.current.retrySheetVariant).toBe('price_moved');
    });

    it('moves to confirm when there is no baseline to compare against', async () => {
      const params = createDefaultParams();
      const { result, rerender } = renderHook(() =>
        usePredictOrderRetry(params),
      );

      await act(async () => {
        params.isOrderNotFilled = true;
        rerender();
      });

      expect(result.current.retrySheetVariant).toBe('confirm');
    });

    it('submits the displayed quote after a price_moved confirmation', async () => {
      const freshPreview = createMockPreview({
        side: Side.SELL,
        sharePrice: 0.62,
        slippage: 0.05,
      });
      const params = createDefaultParams({
        lastSubmittedPreview: createMockPreview({
          side: Side.SELL,
          sharePrice: 0.65,
          slippage: 0.05,
        }),
        refetchPreview: jest.fn().mockResolvedValue({
          status: 'ok' as const,
          preview: freshPreview,
        }),
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
    });
  });

  describe('no-match guard', () => {
    it('moves to no_match and submits nothing when the book cannot match', async () => {
      const params = createDefaultParams({
        refetchPreview: jest.fn().mockResolvedValue({ status: 'no_match' }),
      });
      const { result, rerender } = renderHook(() =>
        usePredictOrderRetry(params),
      );

      await act(async () => {
        params.isOrderNotFilled = true;
        rerender();
      });

      expect(result.current.retrySheetVariant).toBe('no_match');
      expect(result.current.retryQuote).toBeNull();
      expect(params.placeOrder).not.toHaveBeenCalled();
    });

    it('submits nothing when confirming from the no_match state', async () => {
      const params = createDefaultParams({
        refetchPreview: jest.fn().mockResolvedValue({ status: 'no_match' }),
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

      expect(params.placeOrder).not.toHaveBeenCalled();
    });
  });

  describe('handleRetryConfirm', () => {
    it('submits the re-fetched quote, not the stale screen preview', async () => {
      const freshPreview = createMockPreview({ sharePrice: 0.62 });
      const params = createDefaultParams({
        refetchPreview: jest.fn().mockResolvedValue({
          status: 'ok' as const,
          preview: freshPreview,
        }),
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
        refetchPreview: jest.fn().mockResolvedValue({
          status: 'ok' as const,
          preview: freshPreview,
        }),
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

  describe('state guard', () => {
    it.each(['pending', 'filled', 'canceled'] as const)(
      'does not fetch or submit when the order state is %s',
      async (orderState) => {
        const params = createDefaultParams({ orderState });
        const { rerender } = renderHook(() => usePredictOrderRetry(params));

        await act(async () => {
          params.isOrderNotFilled = true;
          rerender();
        });

        expect(params.refetchPreview).not.toHaveBeenCalled();
        expect(params.placeOrder).not.toHaveBeenCalled();
      },
    );

    it('ignores a user-initiated retry while the order is terminal or in flight', async () => {
      const params = createDefaultParams({ orderState: 'filled' });
      const { result } = renderHook(() => usePredictOrderRetry(params));

      await act(async () => {
        await result.current.handleRetry();
      });

      expect(params.refetchPreview).not.toHaveBeenCalled();
      expect(params.placeOrder).not.toHaveBeenCalled();
    });

    it('does not submit a confirmed quote when the order becomes filled first', async () => {
      const params = createDefaultParams();
      const { result, rerender } = renderHook(() =>
        usePredictOrderRetry(params),
      );

      await act(async () => {
        params.isOrderNotFilled = true;
        rerender();
      });

      // The order resolved (filled) between the quote and the confirmation.
      params.orderState = 'filled';
      await act(async () => {
        rerender();
      });

      await act(async () => {
        await result.current.handleRetryConfirm();
      });

      expect(params.placeOrder).not.toHaveBeenCalled();
    });

    it('runs the not-filled edge once a pending order becomes retryable', async () => {
      const params = createDefaultParams({ orderState: 'pending' });
      const { result, rerender } = renderHook(() =>
        usePredictOrderRetry(params),
      );
      const onOpen = jest.fn();
      (
        result.current.retrySheetRef as unknown as {
          current: { onOpenBottomSheet: jest.Mock };
        }
      ).current = { onOpenBottomSheet: onOpen };

      // A not-filled failure arrives while the order is still in flight:
      // blocked, and the transition must not be consumed.
      await act(async () => {
        params.isOrderNotFilled = true;
        rerender();
      });

      expect(params.refetchPreview).not.toHaveBeenCalled();
      expect(onOpen).not.toHaveBeenCalled();

      // The order becomes retryable (still not filled): the edge fires now,
      // so the user still gets the 1-tick confirmation on the fresh quote.
      await act(async () => {
        params.orderState = 'unknown';
        rerender();
      });

      expect(params.refetchPreview).toHaveBeenCalledTimes(1);
      // The sheet opens for the busy state and is re-opened once the fresh
      // quote arrives.
      expect(onOpen).toHaveBeenCalled();
      expect(result.current.retrySheetVariant).toBe('confirm');
    });
  });

  describe('submit lock', () => {
    it('collapses a double tap on confirm into one submission', async () => {
      const params = createDefaultParams();
      const { result, rerender } = renderHook(() =>
        usePredictOrderRetry(params),
      );

      await act(async () => {
        params.isOrderNotFilled = true;
        rerender();
      });

      await act(async () => {
        await Promise.all([
          result.current.handleRetryConfirm(),
          result.current.handleRetryConfirm(),
        ]);
      });

      expect(params.placeOrder).toHaveBeenCalledTimes(1);
    });

    it('collapses a double tap on retry into one fetch', async () => {
      const params = createDefaultParams({ isSheetMode: true });
      const { result } = renderHook(() => usePredictOrderRetry(params));

      await act(async () => {
        await Promise.all([
          result.current.handleRetry(),
          result.current.handleRetry(),
        ]);
      });

      expect(params.refetchPreview).toHaveBeenCalledTimes(1);
    });
  });

  describe('no auto-chase', () => {
    it('does not resubmit after a failed retry without user action', async () => {
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

      expect(params.placeOrder).toHaveBeenCalledTimes(1);

      // The world keeps moving (polls, re-renders, timers) with no user tap:
      // the failed state is terminal for this quote.
      await act(async () => {
        rerender();
      });
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(params.placeOrder).toHaveBeenCalledTimes(1);
      expect(result.current.retrySheetVariant).toBe('failed');
    });
  });

  describe('retry analytics', () => {
    it('includes reason, count, band, and 1-tick decision on retry events', async () => {
      const params = createDefaultParams({
        lastSubmittedPreview: createMockPreview({
          side: Side.SELL,
          sharePrice: 0.65,
          slippage: 0.05,
        }),
        refetchPreview: jest.fn().mockResolvedValue({
          status: 'ok' as const,
          preview: createMockPreview({
            side: Side.SELL,
            sharePrice: 0.62,
            slippage: 0.05,
          }),
        }),
      });
      const { result, rerender } = renderHook(() =>
        usePredictOrderRetry(params),
      );

      await act(async () => {
        params.isOrderNotFilled = true;
        rerender();
      });

      mockTrackEvent.mockClear();

      await act(async () => {
        await result.current.handleRetryConfirm();
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'retry_submitted',
          retryReason: 'order_not_filled',
          retryCount: 1,
          oneTickDecision: 'beyond_one_tick',
          slippageBand: '5%',
          sharePrice: 0.62,
        }),
      );
      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'retry_completed',
          retryOutcome: 'success',
          retryCount: 1,
          oneTickDecision: 'beyond_one_tick',
          slippageBand: '5%',
        }),
      );
    });

    it('reports a failed terminal outcome with a sanitized failure reason', async () => {
      const params = createDefaultParams({
        placeOrder: jest.fn().mockResolvedValue({
          status: 'error' as const,
          error:
            'Swap failed https://secret.example.com/x 0x1234567890123456789012345678901234567890',
        }),
      });
      const { result, rerender } = renderHook(() =>
        usePredictOrderRetry(params),
      );

      await act(async () => {
        params.isOrderNotFilled = true;
        rerender();
      });

      mockTrackEvent.mockClear();

      await act(async () => {
        await result.current.handleRetryConfirm();
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'retry_completed',
          retryOutcome: 'failed',
          failureReason: expect.not.stringContaining(
            '0x1234567890123456789012345678901234567890',
          ),
        }),
      );
      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'retry_completed',
          failureReason: expect.not.stringContaining('https://'),
        }),
      );
    });

    it('increments the retry count across retries within one episode', async () => {
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

      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'retry_completed', retryCount: 1 }),
      );

      // Second user-initiated retry in the same episode (Try again → confirm).
      mockTrackEvent.mockClear();
      await act(async () => {
        await result.current.handleRetry();
      });

      await act(async () => {
        await result.current.handleRetryConfirm();
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'retry_submitted',
          retryCount: 2,
        }),
      );
      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'retry_completed',
          retryOutcome: 'not_filled',
          retryCount: 2,
        }),
      );
    });
  });
});
