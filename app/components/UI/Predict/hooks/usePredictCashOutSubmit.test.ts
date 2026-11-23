import { renderHook, act } from '@testing-library/react-hooks';
import {
  CASH_OUT_PRICE_CHECK_TIMEOUT_MS,
  usePredictCashOutSubmit,
} from './usePredictCashOutSubmit';
import type { PlaceOrderOutcome } from './usePredictPlaceOrder';
import type { RefetchPreviewResult } from './usePredictOrderPreview';
import type { PredictOrderRetrySheetRef } from '../components/PredictOrderRetrySheet';
import { type OrderPreview, type PlaceOrderParams, Side } from '../types';
import Engine from '../../../../core/Engine';

jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      trackPredictOrderEvent: jest.fn(),
    },
  },
}));

jest.mock('../components/PredictOrderRetrySheet', () => ({}));

const mockTrackEvent = jest.mocked(
  Engine.context.PredictController.trackPredictOrderEvent,
);

function createSellPreview(overrides?: Partial<OrderPreview>): OrderPreview {
  return {
    marketId: 'market-123',
    outcomeId: 'outcome-123',
    outcomeTokenId: 'token-456',
    timestamp: Date.now(),
    side: Side.SELL,
    sharePrice: 0.6,
    worstFillPrice: 0.6,
    maxAmountSpent: 10,
    minAmountReceived: 6,
    slippage: 0.05,
    tickSize: 0.01,
    minOrderSize: 1,
    negRisk: false,
    ...overrides,
  };
}

const okResult = (preview: OrderPreview): RefetchPreviewResult => ({
  status: 'ok',
  preview,
});

const analyticsProperties: PlaceOrderParams['analyticsProperties'] = {
  marketId: 'market-123',
};

function setup({
  preview = createSellPreview(),
  refetchPreview = jest.fn(),
}: {
  preview?: OrderPreview | null;
  refetchPreview?: jest.Mock<Promise<RefetchPreviewResult>>;
} = {}) {
  const placeOrder = jest.fn<Promise<PlaceOrderOutcome>, [PlaceOrderParams]>(
    async () => ({
      status: 'success',
      result: { success: true, response: undefined },
    }),
  );
  const hook = renderHook(() =>
    usePredictCashOutSubmit({
      preview,
      refetchPreview,
      placeOrder,
      analyticsProperties,
    }),
  );
  const sheet = {
    onOpenBottomSheet: jest.fn(),
    onCloseBottomSheet: jest.fn(),
  };
  (
    hook.result.current.sheetRef as {
      current: PredictOrderRetrySheetRef | null;
    }
  ).current = sheet;
  return { ...hook, placeOrder, refetchPreview, sheet };
}

describe('usePredictCashOutSubmit', () => {
  beforeEach(() => {
    mockTrackEvent.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('submits the fresh preview, not the one on screen, when the price is within one tick', async () => {
    const fresh = createSellPreview({ sharePrice: 0.59, worstFillPrice: 0.59 });
    const { result, placeOrder, sheet } = setup({
      refetchPreview: jest.fn().mockResolvedValue(okResult(fresh)),
    });

    await act(async () => {
      await result.current.cashOut();
    });

    expect(placeOrder).toHaveBeenCalledTimes(1);
    expect(placeOrder).toHaveBeenCalledWith({
      analyticsProperties,
      preview: fresh,
    });
    expect(sheet.onOpenBottomSheet).not.toHaveBeenCalled();
  });

  it('submits without asking when the fresh price is better', async () => {
    const fresh = createSellPreview({ sharePrice: 0.63, worstFillPrice: 0.62 });
    const { result, placeOrder } = setup({
      refetchPreview: jest.fn().mockResolvedValue(okResult(fresh)),
    });

    await act(async () => {
      await result.current.cashOut();
    });

    expect(placeOrder).toHaveBeenCalledWith(
      expect.objectContaining({ preview: fresh }),
    );
  });

  it.each([
    { label: 'more than one tick', sharePrice: 0.58, worstFillPrice: 0.58 },
    { label: 'more than 5%', sharePrice: 0.5, worstFillPrice: 0.48 },
  ])(
    'asks the user to confirm when the price moved $label',
    async ({ sharePrice, worstFillPrice }) => {
      const fresh = createSellPreview({ sharePrice, worstFillPrice });
      const { result, placeOrder, sheet } = setup({
        refetchPreview: jest.fn().mockResolvedValue(okResult(fresh)),
      });

      await act(async () => {
        await result.current.cashOut();
      });

      expect(placeOrder).not.toHaveBeenCalled();
      expect(sheet.onOpenBottomSheet).toHaveBeenCalledTimes(1);
      expect(result.current.sheetVariant).toBe('price_moved');
      expect(result.current.sheetQuote).toBe(fresh);
      expect(result.current.sheetPreviousPrice).toBe(0.6);
    },
  );

  it('re-fetches on confirm and submits the newest preview checked against the confirmed price', async () => {
    const moved = createSellPreview({ sharePrice: 0.5, worstFillPrice: 0.5 });
    const latest = createSellPreview({
      sharePrice: 0.49,
      worstFillPrice: 0.49,
    });
    const refetchPreview = jest
      .fn()
      .mockResolvedValueOnce(okResult(moved))
      .mockResolvedValueOnce(okResult(latest));
    const { result, placeOrder, sheet } = setup({ refetchPreview });

    await act(async () => {
      await result.current.cashOut();
    });
    await act(async () => {
      await result.current.confirmCashOut();
    });

    expect(refetchPreview).toHaveBeenCalledTimes(2);
    expect(sheet.onCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(placeOrder).toHaveBeenCalledTimes(1);
    expect(placeOrder).toHaveBeenCalledWith(
      expect.objectContaining({ preview: latest }),
    );
  });

  it('asks again when the price keeps moving after the user confirmed', async () => {
    const moved = createSellPreview({ sharePrice: 0.5, worstFillPrice: 0.5 });
    const movedAgain = createSellPreview({
      sharePrice: 0.45,
      worstFillPrice: 0.45,
    });
    const refetchPreview = jest
      .fn()
      .mockResolvedValueOnce(okResult(moved))
      .mockResolvedValueOnce(okResult(movedAgain));
    const { result, placeOrder } = setup({ refetchPreview });

    await act(async () => {
      await result.current.cashOut();
    });
    await act(async () => {
      await result.current.confirmCashOut();
    });

    expect(placeOrder).not.toHaveBeenCalled();
    expect(result.current.sheetVariant).toBe('price_moved');
    expect(result.current.sheetQuote).toBe(movedAgain);
    expect(result.current.sheetPreviousPrice).toBe(0.5);
  });

  it('shows no match without submitting when the full size only fills below the band', async () => {
    const thinBook = createSellPreview({
      sharePrice: 0.6,
      worstFillPrice: 0.5,
    });
    const { result, placeOrder, sheet } = setup({
      refetchPreview: jest.fn().mockResolvedValue(okResult(thinBook)),
    });

    await act(async () => {
      await result.current.cashOut();
    });

    expect(placeOrder).not.toHaveBeenCalled();
    expect(sheet.onOpenBottomSheet).toHaveBeenCalledTimes(1);
    expect(result.current.sheetVariant).toBe('no_match');
  });

  it.each([
    {
      label: 'the book is empty',
      refetchPreview: () => jest.fn().mockResolvedValue({ status: 'no_match' }),
      expectedVariant: 'no_match',
    },
    {
      label: 'the fetch fails',
      refetchPreview: () =>
        jest.fn().mockResolvedValue({ status: 'unavailable' }),
      expectedVariant: 'quote_unavailable',
    },
    {
      label: 'the fetch throws',
      refetchPreview: () => jest.fn().mockRejectedValue(new Error('network')),
      expectedVariant: 'quote_unavailable',
    },
  ])(
    'shows $expectedVariant without submitting when $label',
    async ({ refetchPreview, expectedVariant }) => {
      const { result, placeOrder } = setup({
        refetchPreview: refetchPreview(),
      });

      await act(async () => {
        await result.current.cashOut();
      });

      expect(placeOrder).not.toHaveBeenCalled();
      expect(result.current.sheetVariant).toBe(expectedVariant);
    },
  );

  it('shows the timeout state and never submits a late response', async () => {
    jest.useFakeTimers();
    let resolveFetch: (value: RefetchPreviewResult) => void = () => undefined;
    const refetchPreview = jest.fn(
      () =>
        new Promise<RefetchPreviewResult>((resolve) => {
          resolveFetch = resolve;
        }),
    );
    const { result, placeOrder } = setup({ refetchPreview });

    let cashOutPromise: Promise<void> = Promise.resolve();
    act(() => {
      cashOutPromise = result.current.cashOut();
    });
    await act(async () => {
      jest.advanceTimersByTime(CASH_OUT_PRICE_CHECK_TIMEOUT_MS);
      await cashOutPromise;
    });
    await act(async () => {
      resolveFetch(okResult(createSellPreview()));
    });

    expect(result.current.sheetVariant).toBe('timeout');
    expect(result.current.isCheckingPrice).toBe(false);
    expect(placeOrder).not.toHaveBeenCalled();
  });

  it('ignores duplicate taps while an attempt is in flight', async () => {
    let resolveFetch: (value: RefetchPreviewResult) => void = () => undefined;
    const refetchPreview = jest.fn(
      () =>
        new Promise<RefetchPreviewResult>((resolve) => {
          resolveFetch = resolve;
        }),
    );
    const { result, placeOrder } = setup({ refetchPreview });

    let taps: Promise<void>[] = [];
    act(() => {
      taps = [result.current.cashOut(), result.current.cashOut()];
    });

    expect(result.current.isCheckingPrice).toBe(true);

    await act(async () => {
      resolveFetch(okResult(createSellPreview()));
      await Promise.all(taps);
    });

    expect(refetchPreview).toHaveBeenCalledTimes(1);
    expect(placeOrder).toHaveBeenCalledTimes(1);
  });

  it('checks against the same approved price on Try again', async () => {
    const refetchPreview = jest
      .fn()
      .mockResolvedValueOnce({ status: 'unavailable' })
      .mockResolvedValueOnce(
        okResult(createSellPreview({ sharePrice: 0.58, worstFillPrice: 0.58 })),
      );
    const { result, placeOrder } = setup({ refetchPreview });

    await act(async () => {
      await result.current.cashOut();
    });
    await act(async () => {
      await result.current.retryCashOut();
    });

    expect(placeOrder).not.toHaveBeenCalled();
    expect(result.current.sheetVariant).toBe('price_moved');
    expect(result.current.sheetPreviousPrice).toBe(0.6);
  });

  it('submits nothing when the sheet is dismissed while the price is checked', async () => {
    let resolveFetch: (value: RefetchPreviewResult) => void = () => undefined;
    const refetchPreview = jest
      .fn()
      .mockResolvedValueOnce(
        okResult(createSellPreview({ sharePrice: 0.5, worstFillPrice: 0.5 })),
      )
      .mockImplementationOnce(
        () =>
          new Promise<RefetchPreviewResult>((resolve) => {
            resolveFetch = resolve;
          }),
      );
    const { result, placeOrder } = setup({ refetchPreview });

    await act(async () => {
      await result.current.cashOut();
    });
    let confirmPromise: Promise<void> = Promise.resolve();
    act(() => {
      confirmPromise = result.current.confirmCashOut();
    });
    act(() => {
      result.current.dismissCashOut();
    });
    await act(async () => {
      resolveFetch(
        okResult(createSellPreview({ sharePrice: 0.5, worstFillPrice: 0.5 })),
      );
      await confirmPromise;
    });

    expect(placeOrder).not.toHaveBeenCalled();
    expect(result.current.isCheckingPrice).toBe(false);
  });

  it('submits and tracks nothing when the screen is left while the price is checked', async () => {
    let resolveFetch: (value: RefetchPreviewResult) => void = () => undefined;
    const refetchPreview = jest.fn().mockImplementationOnce(
      () =>
        new Promise<RefetchPreviewResult>((resolve) => {
          resolveFetch = resolve;
        }),
    );
    const { result, placeOrder, unmount } = setup({ refetchPreview });

    let cashOutPromise: Promise<void> = Promise.resolve();
    act(() => {
      cashOutPromise = result.current.cashOut();
    });
    unmount();
    await act(async () => {
      resolveFetch(okResult(createSellPreview()));
      await cashOutPromise;
    });

    expect(placeOrder).not.toHaveBeenCalled();
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('does nothing without a preview on screen', async () => {
    const { result, placeOrder, refetchPreview } = setup({
      preview: null,
      refetchPreview: jest.fn(),
    });

    await act(async () => {
      await result.current.cashOut();
    });

    expect(refetchPreview).not.toHaveBeenCalled();
    expect(placeOrder).not.toHaveBeenCalled();
  });

  describe('analytics', () => {
    it.each([
      {
        outcome: 'submitted',
        result: okResult(
          createSellPreview({ sharePrice: 0.59, worstFillPrice: 0.58 }),
        ),
        sharePrice: 0.59,
        worstFillPrice: 0.58,
      },
      {
        outcome: 'price_moved',
        result: okResult(
          createSellPreview({ sharePrice: 0.5, worstFillPrice: 0.49 }),
        ),
        sharePrice: 0.5,
        worstFillPrice: 0.49,
      },
      {
        outcome: 'no_match',
        result: okResult(
          createSellPreview({ sharePrice: 0.6, worstFillPrice: 0.5 }),
        ),
        sharePrice: 0.6,
        worstFillPrice: 0.5,
      },
      {
        outcome: 'quote_unavailable',
        result: { status: 'unavailable' } as const,
        sharePrice: undefined,
        worstFillPrice: undefined,
      },
    ])(
      'tracks one presubmit_checked event with outcome $outcome',
      async ({ outcome, result: fetchResult, sharePrice, worstFillPrice }) => {
        const { result } = setup({
          refetchPreview: jest.fn().mockResolvedValue(fetchResult),
        });

        await act(async () => {
          await result.current.cashOut();
        });

        expect(mockTrackEvent).toHaveBeenCalledTimes(1);
        expect(mockTrackEvent).toHaveBeenCalledWith({
          status: 'presubmit_checked',
          analyticsProperties,
          sharePrice,
          completionDuration: expect.any(Number),
          presubmitOutcome: outcome,
          approvedPrice: 0.6,
          worstFillPrice,
          reconfirmed: false,
        });
      },
    );

    it('tracks the timeout outcome', async () => {
      jest.useFakeTimers();
      const { result } = setup({
        refetchPreview: jest.fn(
          () => new Promise<RefetchPreviewResult>(() => undefined),
        ),
      });

      let cashOutPromise: Promise<void> = Promise.resolve();
      act(() => {
        cashOutPromise = result.current.cashOut();
      });
      await act(async () => {
        jest.advanceTimersByTime(CASH_OUT_PRICE_CHECK_TIMEOUT_MS);
        await cashOutPromise;
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          presubmitOutcome: 'timeout',
          completionDuration: CASH_OUT_PRICE_CHECK_TIMEOUT_MS,
        }),
      );
    });

    it('marks the check after a confirmed price move as reconfirmed against the new price', async () => {
      const refetchPreview = jest
        .fn()
        .mockResolvedValueOnce(
          okResult(createSellPreview({ sharePrice: 0.5, worstFillPrice: 0.5 })),
        )
        .mockResolvedValueOnce(
          okResult(createSellPreview({ sharePrice: 0.5, worstFillPrice: 0.5 })),
        );
      const { result } = setup({ refetchPreview });

      await act(async () => {
        await result.current.cashOut();
      });
      await act(async () => {
        await result.current.confirmCashOut();
      });

      expect(mockTrackEvent).toHaveBeenCalledTimes(2);
      expect(mockTrackEvent).toHaveBeenLastCalledWith(
        expect.objectContaining({
          presubmitOutcome: 'submitted',
          approvedPrice: 0.5,
          reconfirmed: true,
        }),
      );
    });

    it('tracks nothing when the sheet is dismissed while the price is checked', async () => {
      let resolveFetch: (value: RefetchPreviewResult) => void = () => undefined;
      const refetchPreview = jest
        .fn()
        .mockResolvedValueOnce({ status: 'unavailable' })
        .mockImplementationOnce(
          () =>
            new Promise<RefetchPreviewResult>((resolve) => {
              resolveFetch = resolve;
            }),
        );
      const { result } = setup({ refetchPreview });

      await act(async () => {
        await result.current.cashOut();
      });
      mockTrackEvent.mockClear();
      let retryPromise: Promise<void> = Promise.resolve();
      act(() => {
        retryPromise = result.current.retryCashOut();
      });
      act(() => {
        result.current.dismissCashOut();
      });
      await act(async () => {
        resolveFetch(okResult(createSellPreview()));
        await retryPromise;
      });

      expect(mockTrackEvent).not.toHaveBeenCalled();
    });
  });
});
