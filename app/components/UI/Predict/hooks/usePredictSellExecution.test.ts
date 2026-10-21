import { act, renderHook } from '@testing-library/react-native';
import Engine from '../../../../core/Engine';
import { usePredictSellExecution } from './usePredictSellExecution';
import type { PlaceOrderOutcome } from './usePredictPlaceOrder';
import {
  Side,
  type OrderPreview,
  type PlaceOrderParams,
  type PredictExecutionMetadata,
  type PredictExecutionPreviewResult,
} from '../types';
import { PredictTradeStatus } from '../constants/eventNames';

jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      trackPredictOrderEvent: jest.fn(),
    },
  },
}));

const mockTrackEvent = Engine.context.PredictController
  .trackPredictOrderEvent as jest.Mock;

const SELL_SLIPPAGE = 0.05;

/** Displayed sell preview: the 0.50 baseline the user approved. */
const displayedPreview: OrderPreview = {
  marketId: 'market-1',
  outcomeId: 'outcome-1',
  outcomeTokenId: 'token-1',
  timestamp: 1,
  side: Side.SELL,
  sharePrice: 0.5,
  maxAmountSpent: 10,
  minAmountReceived: 4.9,
  slippage: SELL_SLIPPAGE,
  tickSize: 0.01,
  minOrderSize: 1,
  negRisk: false,
};

function createExecutionPreview(
  overrides?: Partial<OrderPreview>,
): OrderPreview {
  return {
    ...displayedPreview,
    fetchedAt: Date.now(),
    ...overrides,
  };
}

function createExecution(
  overrides?: Partial<PredictExecutionMetadata>,
): PredictExecutionMetadata {
  return {
    fetchedAt: Date.now(),
    requestedSize: 10,
    executableSize: 10,
    approvedPrice: 0.5,
    refreshedPrice: 0.49,
    bandFloorPrice: 0.48,
    worstExecutablePrice: 0.49,
    tickSize: 0.01,
    ...overrides,
  };
}

/** The `executable` member of `PredictExecutionPreviewResult`. */
type ExecutablePreviewResult = Extract<
  PredictExecutionPreviewResult,
  { status: 'executable' }
>;

function createExecutableResult(overrides?: {
  preview?: OrderPreview;
  execution?: PredictExecutionMetadata;
}): ExecutablePreviewResult {
  return {
    status: 'executable',
    preview: overrides?.preview ?? createExecutionPreview(),
    execution: overrides?.execution ?? createExecution(),
  };
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe('usePredictSellExecution', () => {
  const mockPreviewExecutionOrder = jest.fn();
  const mockPlaceOrder = jest.fn();
  const onOpenBottomSheet = jest.fn();
  const onCloseBottomSheet = jest.fn();

  const successOutcome: PlaceOrderOutcome = {
    status: 'success',
    result: { success: true, response: undefined },
  };

  const setupHook = () => {
    const rendered = renderHook(() =>
      usePredictSellExecution({
        marketId: 'market-1',
        outcomeId: 'outcome-1',
        outcomeTokenId: 'token-1',
        size: 10,
        positionId: 'position-1',
        preview: displayedPreview,
        previewExecutionOrder: mockPreviewExecutionOrder,
        placeOrder: mockPlaceOrder,
        analyticsProperties: { marketId: 'market-1' },
      }),
    );
    rendered.result.current.executionSheetRef.current = {
      onOpenBottomSheet,
      onCloseBottomSheet,
    };
    return rendered;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('auto-submits the exact fresh preview within one tick of the approved baseline', async () => {
    // 0.49 is one tick worse than the approved 0.50 — inside the one-tick
    // noise band, so no confirmation sheet is shown.
    const executable = createExecutableResult();
    mockPreviewExecutionOrder.mockResolvedValueOnce(executable);
    mockPlaceOrder.mockResolvedValueOnce(successOutcome);

    const { result } = setupHook();
    await act(async () => {
      await result.current.handleCashOut();
    });

    expect(mockPreviewExecutionOrder).toHaveBeenCalledTimes(1);
    expect(mockPreviewExecutionOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        marketId: 'market-1',
        outcomeId: 'outcome-1',
        outcomeTokenId: 'token-1',
        side: Side.SELL,
        size: 10,
        approvedPrice: 0.5,
        slippage: SELL_SLIPPAGE,
        positionId: 'position-1',
      }),
    );
    expect(mockPlaceOrder).toHaveBeenCalledTimes(1);
    const placedParams = mockPlaceOrder.mock.calls[0][0] as PlaceOrderParams;
    expect(placedParams.preview).toBe(executable.preview);
    expect(placedParams.analyticsProperties).toEqual({ marketId: 'market-1' });
    // The acceptable path never opens the sheet.
    expect(onOpenBottomSheet).not.toHaveBeenCalled();
    expect(result.current.status).toBe('idle');
  });

  it('requires confirmation when the fresh price is more than one tick worse', async () => {
    // 0.48 is two ticks worse than the approved 0.50 but still inside the 5%
    // band, so the exact fresh quote is shown for an explicit confirmation.
    const moved = createExecutableResult({
      preview: createExecutionPreview({ sharePrice: 0.48 }),
      execution: createExecution({
        refreshedPrice: 0.48,
        worstExecutablePrice: 0.48,
      }),
    });
    mockPreviewExecutionOrder.mockResolvedValueOnce(moved);

    const { result } = setupHook();
    await act(async () => {
      await result.current.handleCashOut();
    });

    expect(result.current.status).toBe('confirm');
    expect(result.current.quote).toBe(moved.preview);
    expect(result.current.execution).toBe(moved.execution);
    expect(result.current.baselinePrice).toBe(0.5);
    expect(mockPlaceOrder).not.toHaveBeenCalled();
    expect(onOpenBottomSheet).toHaveBeenCalledTimes(1);
  });

  it('submits the exact fresh quote after Confirm adopts the candidate baseline', async () => {
    // First fetch: the price moved to 0.48 and the sheet opened.
    const moved = createExecutableResult({
      preview: createExecutionPreview({ sharePrice: 0.48 }),
      execution: createExecution({
        refreshedPrice: 0.48,
        worstExecutablePrice: 0.48,
      }),
    });
    mockPreviewExecutionOrder.mockResolvedValueOnce(moved);

    const { result } = setupHook();
    await act(async () => {
      await result.current.handleCashOut();
    });

    // Confirm: another execution preview is fetched against the 0.48
    // candidate baseline, and that fresh quote — not the displayed
    // candidate — is submitted.
    const accepted = createExecutableResult({
      preview: createExecutionPreview({ sharePrice: 0.48 }),
      execution: createExecution({
        approvedPrice: 0.48,
        refreshedPrice: 0.48,
        worstExecutablePrice: 0.48,
      }),
    });
    mockPreviewExecutionOrder.mockResolvedValueOnce(accepted);
    mockPlaceOrder.mockResolvedValueOnce(successOutcome);

    await act(async () => {
      await result.current.handleConfirm();
    });

    expect(mockPreviewExecutionOrder).toHaveBeenLastCalledWith(
      expect.objectContaining({ approvedPrice: 0.48, slippage: SELL_SLIPPAGE }),
    );
    expect(mockPlaceOrder).toHaveBeenCalledTimes(1);
    const placedParams = mockPlaceOrder.mock.calls[0][0] as PlaceOrderParams;
    expect(placedParams.preview).toBe(accepted.preview);
    expect(result.current.status).toBe('idle');
    expect(onCloseBottomSheet).toHaveBeenCalledTimes(1);
  });

  it('updates the candidate and asks again when the Confirm refetch moves beyond one tick', async () => {
    const moved = createExecutableResult({
      preview: createExecutionPreview({ sharePrice: 0.48 }),
      execution: createExecution({
        refreshedPrice: 0.48,
        worstExecutablePrice: 0.48,
      }),
    });
    mockPreviewExecutionOrder.mockResolvedValueOnce(moved);

    const { result } = setupHook();
    await act(async () => {
      await result.current.handleCashOut();
    });

    // The Confirm refetch moved another two ticks worse: the candidate is
    // replaced and another explicit confirmation is required.
    const movedAgain = createExecutableResult({
      preview: createExecutionPreview({ sharePrice: 0.46 }),
      execution: createExecution({
        approvedPrice: 0.48,
        refreshedPrice: 0.46,
        worstExecutablePrice: 0.46,
      }),
    });
    mockPreviewExecutionOrder.mockResolvedValueOnce(movedAgain);

    await act(async () => {
      await result.current.handleConfirm();
    });

    expect(result.current.status).toBe('confirm');
    expect(result.current.quote).toBe(movedAgain.preview);
    expect(result.current.baselinePrice).toBe(0.48);
    expect(mockPlaceOrder).not.toHaveBeenCalled();
  });

  it('maps settled states to sheet variants and keeps the variant and candidate while busy', async () => {
    const moved = createExecutableResult({
      preview: createExecutionPreview({ sharePrice: 0.48 }),
      execution: createExecution({
        refreshedPrice: 0.48,
        worstExecutablePrice: 0.48,
      }),
    });
    mockPreviewExecutionOrder.mockResolvedValueOnce(moved);

    const { result } = setupHook();
    await act(async () => {
      await result.current.handleCashOut();
    });

    // The confirm state maps to the price-moved sheet variant.
    expect(result.current.sheetVariant).toBe('price_moved');

    // While the Confirm refetch is in flight, the busy phase keeps the
    // variant, candidate quote, and execution facts for the open sheet.
    const deferred = createDeferred<PredictExecutionPreviewResult>();
    mockPreviewExecutionOrder.mockReturnValueOnce(deferred.promise);
    let confirmFlow!: Promise<void>;
    await act(async () => {
      confirmFlow = result.current.handleConfirm();
    });

    expect(result.current.status).toBe('validating');
    expect(result.current.sheetVariant).toBe('price_moved');
    expect(result.current.quote).toBe(moved.preview);
    expect(result.current.execution).toBe(moved.execution);

    await act(async () => {
      deferred.resolve({ status: 'timeout' });
      await confirmFlow;
    });

    // A terminal market state settles the timeout variant.
    expect(result.current.status).toBe('timeout');
    expect(result.current.sheetVariant).toBe('timeout');
    expect(mockPlaceOrder).not.toHaveBeenCalled();
  });

  it('settles no_match with partial execution facts and submits nothing', async () => {
    // A book whose in-band depth cannot fill the requested size — including
    // a best bid beyond the 5% band — classifies as no_match.
    mockPreviewExecutionOrder.mockResolvedValueOnce({
      status: 'no_match',
      execution: createExecution({ executableSize: 4 }),
    });

    const { result } = setupHook();
    await act(async () => {
      await result.current.handleCashOut();
    });

    expect(result.current.status).toBe('no_match');
    expect(result.current.execution).toEqual(
      expect.objectContaining({ executableSize: 4 }),
    );
    expect(result.current.quote).toBeNull();
    expect(mockPlaceOrder).not.toHaveBeenCalled();
    expect(onOpenBottomSheet).toHaveBeenCalledTimes(1);
  });

  it('settles timeout and submits nothing', async () => {
    mockPreviewExecutionOrder.mockResolvedValueOnce({ status: 'timeout' });

    const { result } = setupHook();
    await act(async () => {
      await result.current.handleCashOut();
    });

    expect(result.current.status).toBe('timeout');
    expect(result.current.execution).toBeNull();
    expect(mockPlaceOrder).not.toHaveBeenCalled();
    expect(onOpenBottomSheet).toHaveBeenCalledTimes(1);
  });

  it('settles unavailable and submits nothing', async () => {
    mockPreviewExecutionOrder.mockResolvedValueOnce({
      status: 'unavailable',
    });

    const { result } = setupHook();
    await act(async () => {
      await result.current.handleCashOut();
    });

    expect(result.current.status).toBe('unavailable');
    expect(mockPlaceOrder).not.toHaveBeenCalled();
    expect(onOpenBottomSheet).toHaveBeenCalledTimes(1);
  });

  it('recovers once after a stale rejection against the same approved baseline', async () => {
    const initial = createExecutableResult();
    const recovered = createExecutableResult();
    mockPreviewExecutionOrder
      .mockResolvedValueOnce(initial)
      .mockResolvedValueOnce(recovered);
    mockPlaceOrder
      .mockResolvedValueOnce({ status: 'preview_stale' })
      .mockResolvedValueOnce(successOutcome);

    const { result } = setupHook();
    await act(async () => {
      await result.current.handleCashOut();
    });

    expect(mockPreviewExecutionOrder).toHaveBeenCalledTimes(2);
    // Both passes measure against the SAME user-approved baseline.
    expect(mockPreviewExecutionOrder).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ approvedPrice: 0.5 }),
    );
    expect(mockPreviewExecutionOrder).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ approvedPrice: 0.5 }),
    );
    expect(mockPlaceOrder).toHaveBeenCalledTimes(2);
    const recoveredParams = mockPlaceOrder.mock.calls[1][0] as PlaceOrderParams;
    expect(recoveredParams.preview).toBe(recovered.preview);
    expect(result.current.status).toBe('idle');
  });

  it('settles unavailable after a second stale rejection', async () => {
    mockPreviewExecutionOrder
      .mockResolvedValueOnce(createExecutableResult())
      .mockResolvedValueOnce(createExecutableResult());
    mockPlaceOrder
      .mockResolvedValueOnce({ status: 'preview_stale' })
      .mockResolvedValueOnce({ status: 'preview_stale' });

    const { result } = setupHook();
    await act(async () => {
      await result.current.handleCashOut();
    });

    // Exactly one bounded recovery: never a third fetch or submission.
    expect(mockPreviewExecutionOrder).toHaveBeenCalledTimes(2);
    expect(mockPlaceOrder).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe('unavailable');
    expect(onOpenBottomSheet).toHaveBeenCalledTimes(1);
  });

  it('triggers one flow for same-frame duplicate Cash Out and Confirm presses', async () => {
    const deferred = createDeferred<PredictExecutionPreviewResult>();
    mockPreviewExecutionOrder.mockReturnValueOnce(deferred.promise);

    const { result } = setupHook();
    let flow!: Promise<void>;
    await act(async () => {
      flow = result.current.handleCashOut();
      // Duplicate presses in the same frame are ignored by the
      // synchronous single-flight lock.
      await result.current.handleCashOut();
      await result.current.handleConfirm();
    });

    await act(async () => {
      deferred.resolve(createExecutableResult());
      mockPlaceOrder.mockResolvedValueOnce(successOutcome);
      await flow;
    });

    expect(mockPreviewExecutionOrder).toHaveBeenCalledTimes(1);
    expect(mockPlaceOrder).toHaveBeenCalledTimes(1);
  });

  it('releases the lock after a terminal market state so Try Again starts a new flow', async () => {
    mockPreviewExecutionOrder
      .mockResolvedValueOnce({ status: 'timeout' })
      .mockResolvedValueOnce(createExecutableResult());
    mockPlaceOrder.mockResolvedValueOnce(successOutcome);

    const { result } = setupHook();
    await act(async () => {
      await result.current.handleCashOut();
    });
    expect(result.current.status).toBe('timeout');

    // Try Again revalidates against the same approved baseline.
    await act(async () => {
      await result.current.handleTryAgain();
    });

    expect(mockPreviewExecutionOrder).toHaveBeenCalledTimes(2);
    expect(mockPreviewExecutionOrder).toHaveBeenLastCalledWith(
      expect.objectContaining({ approvedPrice: 0.5 }),
    );
    expect(mockPlaceOrder).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('idle');
  });

  it('releases the lock after a settled stale-unavailable outcome so Cash Out can start again', async () => {
    mockPreviewExecutionOrder
      .mockResolvedValueOnce(createExecutableResult())
      .mockResolvedValueOnce(createExecutableResult())
      .mockResolvedValueOnce(createExecutableResult());
    mockPlaceOrder
      .mockResolvedValueOnce({ status: 'preview_stale' })
      .mockResolvedValueOnce({ status: 'preview_stale' })
      .mockResolvedValueOnce(successOutcome);

    const { result } = setupHook();
    await act(async () => {
      await result.current.handleCashOut();
    });
    expect(result.current.status).toBe('unavailable');

    await act(async () => {
      await result.current.handleCashOut();
    });

    expect(mockPreviewExecutionOrder).toHaveBeenCalledTimes(3);
    expect(mockPlaceOrder).toHaveBeenCalledTimes(3);
    expect(result.current.status).toBe('idle');
  });

  it('discards the result and submits nothing when the hook unmounts mid-validation', async () => {
    const deferred = createDeferred<PredictExecutionPreviewResult>();
    mockPreviewExecutionOrder.mockReturnValueOnce(deferred.promise);

    const { result, unmount } = setupHook();
    let flow!: Promise<void>;
    await act(async () => {
      flow = result.current.handleCashOut();
    });

    unmount();

    await act(async () => {
      deferred.resolve(createExecutableResult());
      await flow;
    });

    expect(mockPlaceOrder).not.toHaveBeenCalled();
  });

  it('discards the result and submits nothing when dismissal invalidates the intent', async () => {
    const deferred = createDeferred<PredictExecutionPreviewResult>();
    mockPreviewExecutionOrder.mockReturnValueOnce(deferred.promise);

    const { result } = setupHook();
    let flow!: Promise<void>;
    await act(async () => {
      flow = result.current.handleCashOut();
    });

    // Defensive: dismissal during an in-flight intent invalidates it, even
    // though the wired sheet disables dismissal during active work.
    act(() => {
      result.current.handleDismiss();
    });

    await act(async () => {
      deferred.resolve(createExecutableResult());
      await flow;
    });

    expect(mockPlaceOrder).not.toHaveBeenCalled();
    expect(result.current.status).toBe('idle');
  });

  describe('pre-submit analytics', () => {
    it('tracks the decision with the exact facts it was decided from', async () => {
      mockPreviewExecutionOrder.mockResolvedValueOnce(createExecutableResult());
      mockPlaceOrder.mockResolvedValueOnce(successOutcome);

      const { result } = setupHook();
      await act(async () => {
        await result.current.handleCashOut();
      });

      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
      expect(mockTrackEvent).toHaveBeenCalledWith({
        status: PredictTradeStatus.PRESUBMIT_DECIDED,
        analyticsProperties: { marketId: 'market-1' },
        sharePrice: 0.5,
        quoteAgeMs: expect.any(Number),
        requestedSize: 10,
        executableSize: 10,
        approvedPrice: 0.5,
        refreshedPrice: 0.49,
        worstExecutablePrice: 0.49,
        bandFloorPrice: 0.48,
        tickSize: 0.01,
        slippageBand: '5%',
        preSubmitDecision: 'within_one_tick',
        // The acceptable auto-submit path has no confirmation episode.
        reconfirmOutcome: undefined,
      });
    });

    it('tracks no-match as a terminal market outcome without a technical failure', async () => {
      mockPreviewExecutionOrder.mockResolvedValueOnce({
        status: 'no_match',
        execution: createExecution({
          executableSize: 4,
          refreshedPrice: undefined,
          worstExecutablePrice: undefined,
        }),
      });

      const { result } = setupHook();
      await act(async () => {
        await result.current.handleCashOut();
      });

      expect(mockPlaceOrder).not.toHaveBeenCalled();
      const noMatchEvent = mockTrackEvent.mock.calls.find(
        ([args]) => args.preSubmitDecision === 'no_match',
      );
      expect(noMatchEvent).toBeDefined();
      const [noMatchArgs] = noMatchEvent as unknown as [
        {
          requestedSize?: number;
          executableSize?: number;
          failureCategory?: string;
          failureReason?: string;
        },
      ];
      // A no-match is a terminal market outcome: the requested and
      // executable sizes say why, with no technical submission failure.
      expect(noMatchArgs.requestedSize).toBe(10);
      expect(noMatchArgs.executableSize).toBe(4);
      expect(noMatchArgs.failureCategory).toBe('no_match');
      expect(noMatchArgs.failureReason).toBeUndefined();
    });

    it('tracks timeout and unavailable as distinct decisions', async () => {
      mockPreviewExecutionOrder
        .mockResolvedValueOnce({ status: 'timeout' })
        .mockResolvedValueOnce({ status: 'unavailable' });

      const first = setupHook();
      await act(async () => {
        await first.result.current.handleCashOut();
      });

      const second = setupHook();
      await act(async () => {
        await second.result.current.handleCashOut();
      });

      const decisions = mockTrackEvent.mock.calls
        .map(([args]) => args.preSubmitDecision)
        .filter(
          (decision) => decision === 'timeout' || decision === 'unavailable',
        );
      expect(decisions).toEqual(['timeout', 'unavailable']);
    });

    it('tracks confirmed and refreshed-again reconfirm outcomes', async () => {
      // First pass: moved quote asks for confirmation.
      mockPreviewExecutionOrder.mockResolvedValueOnce(
        createExecutableResult({
          preview: createExecutionPreview({ sharePrice: 0.48 }),
          execution: createExecution({
            refreshedPrice: 0.48,
            worstExecutablePrice: 0.48,
          }),
        }),
      );

      const { result } = setupHook();
      await act(async () => {
        await result.current.handleCashOut();
      });

      // Confirm refetch moves again: the candidate is replaced and the user
      // is asked once more.
      mockPreviewExecutionOrder.mockResolvedValueOnce(
        createExecutableResult({
          preview: createExecutionPreview({ sharePrice: 0.46 }),
          execution: createExecution({
            approvedPrice: 0.48,
            refreshedPrice: 0.46,
            worstExecutablePrice: 0.46,
          }),
        }),
      );
      await act(async () => {
        await result.current.handleConfirm();
      });

      // The confirm refetch accepts the candidate and submits.
      mockPreviewExecutionOrder.mockResolvedValueOnce(
        createExecutableResult({
          preview: createExecutionPreview({ sharePrice: 0.46 }),
          execution: createExecution({
            approvedPrice: 0.46,
            refreshedPrice: 0.46,
            worstExecutablePrice: 0.46,
          }),
        }),
      );
      mockPlaceOrder.mockResolvedValueOnce(successOutcome);
      await act(async () => {
        await result.current.handleConfirm();
      });

      const reconfirmOutcomes = mockTrackEvent.mock.calls
        .map(([args]) => args.reconfirmOutcome)
        .filter((outcome) => outcome !== undefined);
      expect(reconfirmOutcomes).toEqual(['refreshed_again', 'confirmed']);
    });

    it('tracks stale-recovered on the bounded recovery', async () => {
      mockPreviewExecutionOrder
        .mockResolvedValueOnce(createExecutableResult())
        .mockResolvedValueOnce(createExecutableResult());
      // First submission is rejected as stale; the single recovery resubmits.
      mockPlaceOrder
        .mockResolvedValueOnce({ status: 'preview_stale' })
        .mockResolvedValueOnce(successOutcome);

      const { result } = setupHook();
      await act(async () => {
        await result.current.handleCashOut();
      });

      const staleRecoveredEvent = mockTrackEvent.mock.calls.find(
        ([args]) => args.reconfirmOutcome === 'stale_recovered',
      );
      expect(staleRecoveredEvent).toBeDefined();
      expect(mockPlaceOrder).toHaveBeenCalledTimes(2);
    });

    it('tracks the user dismissal without a submission', async () => {
      mockPreviewExecutionOrder.mockResolvedValueOnce(
        createExecutableResult({
          preview: createExecutionPreview({ sharePrice: 0.48 }),
          execution: createExecution({
            refreshedPrice: 0.48,
            worstExecutablePrice: 0.48,
          }),
        }),
      );

      const { result } = setupHook();
      await act(async () => {
        await result.current.handleCashOut();
      });
      expect(result.current.status).toBe('confirm');

      act(() => {
        result.current.handleDismiss();
      });

      expect(mockPlaceOrder).not.toHaveBeenCalled();
      const dismissedEvent = mockTrackEvent.mock.calls.find(
        ([args]) => args.status === PredictTradeStatus.PRESUBMIT_DISMISSED,
      );
      expect(dismissedEvent).toBeDefined();
      const [dismissedArgs] = dismissedEvent as unknown as [
        {
          preSubmitDecision: string;
          reconfirmOutcome: string;
          requestedSize: number;
        },
      ];
      expect(dismissedArgs.preSubmitDecision).toBe('beyond_one_tick');
      expect(dismissedArgs.reconfirmOutcome).toBe('dismissed');
      expect(dismissedArgs.requestedSize).toBe(10);
    });

    it('does not track a dismissal for the terminal settlement close', async () => {
      mockPreviewExecutionOrder.mockResolvedValueOnce(createExecutableResult());
      mockPlaceOrder.mockResolvedValueOnce(successOutcome);

      const { result } = setupHook();
      await act(async () => {
        await result.current.handleCashOut();
      });

      expect(mockPlaceOrder).toHaveBeenCalledTimes(1);
      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
      const statuses = mockTrackEvent.mock.calls.map(([args]) => args.status);
      expect(statuses).not.toContain(PredictTradeStatus.PRESUBMIT_DISMISSED);
    });
  });
});
