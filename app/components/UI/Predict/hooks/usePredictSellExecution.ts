import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  PredictOrderRetrySheetRef,
  PredictOrderRetrySheetVariant,
} from '../components/PredictOrderRetrySheet';
import type { PlaceOrderOutcome } from './usePredictPlaceOrder';
import { getPredictPriceConsent } from '../utils/prices';
import {
  Side,
  type OrderPreview,
  type PlaceOrderParams,
  type PredictExecutionMetadata,
  type PredictExecutionPreviewResult,
  type PreviewExecutionOrderParams,
} from '../types';

/**
 * Pre-submit sell execution flow phase. `validating` and `submitting` are the
 * busy phases (loading CTA / sheet confirm button); `confirm`, `no_match`,
 * `timeout`, and `unavailable` are settled sheet states awaiting a user
 * action; `idle` is the resting state.
 */
export type PredictSellExecutionStatus =
  | 'idle'
  | 'validating'
  | 'submitting'
  | 'confirm'
  | 'no_match'
  | 'timeout'
  | 'unavailable';

interface PredictSellExecutionState {
  status: PredictSellExecutionStatus;
  /**
   * Candidate quote awaiting explicit confirmation ('confirm' status only).
   * When submitted, the exact fresh preview is submitted — never a stale
   * candidate.
   */
  quote: OrderPreview | null;
  /** Execution facts for the candidate or failed classification, when present. */
  execution: PredictExecutionMetadata | null;
  /** Approved price baseline the candidate was classified against. */
  baselinePrice: number | null;
  /** Approved slippage band that goes with `baselinePrice`. */
  baselineSlippage: number | null;
}

const IDLE_STATE: PredictSellExecutionState = {
  status: 'idle',
  quote: null,
  execution: null,
  baselinePrice: null,
  baselineSlippage: null,
};

/**
 * Classification of one freshly fetched execution preview against the
 * approved baseline: `submit` (price better/equal/within one tick and the
 * full size executable in band), `confirm` (more than one tick worse —
 * requires an explicit re-confirmation), or a terminal market/transport
 * state that submits nothing.
 */
type ExecutionClassification =
  | {
      outcome: 'submit';
      preview: OrderPreview;
      execution: PredictExecutionMetadata;
    }
  | {
      outcome: 'confirm';
      preview: OrderPreview;
      execution: PredictExecutionMetadata;
    }
  | { outcome: 'no_match'; execution: PredictExecutionMetadata }
  | { outcome: 'timeout' }
  | { outcome: 'unavailable' };

interface UsePredictSellExecutionParams {
  /** Active order identity captured for every validation request. */
  marketId: string;
  outcomeId: string;
  outcomeTokenId: string;
  /** Shares to sell. */
  size: number;
  positionId?: string;
  /**
   * The sell preview currently displayed on the screen. Its price is the
   * approved baseline the first validation measures from; only an explicit
   * Confirm adopts a new baseline.
   */
  preview: OrderPreview | null | undefined;
  /** Pre-submit execution-preview operation (from usePredictTrading). */
  previewExecutionOrder: (
    params: PreviewExecutionOrderParams,
  ) => Promise<PredictExecutionPreviewResult>;
  /** Final placement owner (from usePredictPlaceOrder). */
  placeOrder: (params: PlaceOrderParams) => Promise<PlaceOrderOutcome>;
  /** Analytics context forwarded to placement. */
  analyticsProperties: PlaceOrderParams['analyticsProperties'];
}

/**
 * Sheet variant for each settled status. Busy phases (validating,
 * submitting) keep the last settled variant so an open sheet keeps its
 * content while a Confirm refetch or placement is in flight.
 */
const EXECUTION_SHEET_VARIANTS: Partial<
  Record<PredictSellExecutionStatus, PredictOrderRetrySheetVariant>
> = {
  confirm: 'price_moved',
  no_match: 'no_match',
  timeout: 'timeout',
  unavailable: 'quote_unavailable',
};

/**
 * Pre-submit sell execution orchestration: fetches a live order book,
 * validates it against the user's approved price and slippage band, and
 * submits the exact fresh preview only when the full size is executable in
 * band and the refreshed price is better, equal, or at most one tick worse.
 * A worse move requires an explicit confirmation; no-match, timeout, and
 * unavailable outcomes submit nothing. One bounded stale-signing recovery is
 * performed per user action; a second stale rejection settles unavailable.
 */
export function usePredictSellExecution({
  marketId,
  outcomeId,
  outcomeTokenId,
  size,
  positionId,
  preview,
  previewExecutionOrder,
  placeOrder,
  analyticsProperties,
}: UsePredictSellExecutionParams) {
  const [state, setState] = useState<PredictSellExecutionState>(IDLE_STATE);
  // Mirrors render state so entry callbacks never read a stale closure.
  const stateRef = useRef(state);
  stateRef.current = state;

  // Sheet variant for the current flow: derived from the settled status and
  // kept stable across the busy phases so an open sheet keeps its content
  // while a Confirm refetch or placement is in flight.
  const sheetVariantRef = useRef<PredictOrderRetrySheetVariant>('price_moved');
  sheetVariantRef.current =
    EXECUTION_SHEET_VARIANTS[state.status] ?? sheetVariantRef.current;

  const executionSheetRef = useRef<PredictOrderRetrySheetRef>(null);
  // Single-flight lock covering validation and placement. Managed
  // exclusively here — never synced from render state — so a duplicate tap
  // in the same frame cannot slip through between the flip and the next
  // render. Released in the acquiring flow's finally on every terminal
  // branch.
  const isInFlightRef = useRef(false);
  const isMountedRef = useRef(true);
  // Generation identity: bumped on every user action and on dismissal so
  // late responses from an obsolete intent are discarded.
  const intentIdRef = useRef(0);

  useEffect(
    () => () => {
      isMountedRef.current = false;
      intentIdRef.current += 1;
    },
    [],
  );

  const updateState = useCallback(
    (patch: Partial<PredictSellExecutionState>) => {
      setState((previous) => ({ ...previous, ...patch }));
    },
    [],
  );

  const settleIdle = useCallback(() => {
    setState(IDLE_STATE);
  }, []);

  /**
   * Fetches one fresh execution preview and classifies it against the
   * approved baseline. Never touches state: intent currency is checked by
   * the caller between the await points.
   */
  const fetchClassification = useCallback(
    async ({
      baselinePrice,
      slippage,
    }: {
      baselinePrice: number;
      slippage: number;
    }): Promise<ExecutionClassification> => {
      let result: PredictExecutionPreviewResult;
      try {
        result = await previewExecutionOrder({
          marketId,
          outcomeId,
          outcomeTokenId,
          side: Side.SELL,
          size,
          approvedPrice: baselinePrice,
          slippage,
          ...(positionId ? { positionId } : {}),
        });
      } catch {
        // Unexpected internal error (the controller logs it): settle as
        // unavailable rather than submitting anything.
        return { outcome: 'unavailable' };
      }

      switch (result.status) {
        case 'no_match':
          return { outcome: 'no_match', execution: result.execution };
        case 'timeout':
          return { outcome: 'timeout' };
        case 'unavailable':
          return { outcome: 'unavailable' };
        case 'executable': {
          const consent = getPredictPriceConsent({
            side: Side.SELL,
            approvedPrice: baselinePrice,
            refreshedPrice: result.execution.refreshedPrice ?? baselinePrice,
            tickSize: result.execution.tickSize,
          });
          return consent.withinOneTick
            ? {
                outcome: 'submit',
                preview: result.preview,
                execution: result.execution,
              }
            : {
                outcome: 'confirm',
                preview: result.preview,
                execution: result.execution,
              };
        }
      }
    },
    [
      previewExecutionOrder,
      marketId,
      outcomeId,
      outcomeTokenId,
      size,
      positionId,
    ],
  );

  /**
   * One validation pass: fetch + classify, then submit when acceptable.
   * Runs at most twice per user action — the second pass is the single
   * bounded stale-signing recovery against the same approved baseline.
   */
  const runFlow = useCallback(
    async ({
      intentId,
      baselinePrice,
      slippage,
    }: {
      intentId: number;
      baselinePrice: number;
      slippage: number;
    }) => {
      const isCurrentIntent = () =>
        intentIdRef.current === intentId && isMountedRef.current;
      let staleRecoveryUsed = false;

      for (;;) {
        // The candidate quote and execution facts stay visible while an
        // already-open confirm sheet waits on this fetch; only a new
        // settled state replaces or clears them.
        updateState({
          status: 'validating',
          baselinePrice,
          baselineSlippage: slippage,
        });

        const classification = await fetchClassification({
          baselinePrice,
          slippage,
        });
        if (!isCurrentIntent()) {
          return;
        }

        switch (classification.outcome) {
          case 'no_match':
            updateState({
              status: 'no_match',
              quote: null,
              execution: classification.execution,
            });
            executionSheetRef.current?.onOpenBottomSheet();
            return;
          case 'timeout':
            updateState({ status: 'timeout', quote: null, execution: null });
            executionSheetRef.current?.onOpenBottomSheet();
            return;
          case 'unavailable':
            updateState({
              status: 'unavailable',
              quote: null,
              execution: null,
            });
            executionSheetRef.current?.onOpenBottomSheet();
            return;
          case 'confirm':
            updateState({
              status: 'confirm',
              quote: classification.preview,
              execution: classification.execution,
            });
            executionSheetRef.current?.onOpenBottomSheet();
            return;
          default:
            break;
        }

        // Price consent passed: submit the exact fresh preview.
        updateState({
          status: 'submitting',
          quote: classification.preview,
          execution: classification.execution,
        });
        const outcome = await placeOrder({
          analyticsProperties,
          preview: classification.preview,
        });
        if (!isCurrentIntent()) {
          return;
        }

        if (outcome.status !== 'preview_stale') {
          // Terminal placement outcome: usePredictPlaceOrder owns result UX
          // (toasts, post-failure retry lifecycle, screen pop); the
          // pre-submit flow settles and closes its sheet.
          executionSheetRef.current?.onCloseBottomSheet();
          settleIdle();
          return;
        }

        if (staleRecoveryUsed) {
          // A second stale rejection settles unavailable: never loop.
          updateState({ status: 'unavailable', quote: null, execution: null });
          executionSheetRef.current?.onOpenBottomSheet();
          return;
        }
        // One bounded recovery: repeat validation + submission once against
        // the same user-approved baseline.
        staleRecoveryUsed = true;
      }
    },
    [
      fetchClassification,
      placeOrder,
      analyticsProperties,
      updateState,
      settleIdle,
    ],
  );

  /**
   * Cash Out entry point. The displayed preview's price is the approved
   * baseline; a fresh execution preview must confirm it before anything is
   * signed.
   */
  const handleCashOut = useCallback(async () => {
    if (!preview || isInFlightRef.current) {
      return;
    }
    isInFlightRef.current = true;
    const intentId = ++intentIdRef.current;
    try {
      await runFlow({
        intentId,
        baselinePrice: preview.sharePrice,
        slippage: preview.slippage,
      });
    } finally {
      isInFlightRef.current = false;
    }
  }, [preview, runFlow]);

  /**
   * Confirm entry point (price-moved sheet). Pressing Confirm adopts the
   * displayed candidate quote as the new approved baseline, then a fresh
   * execution preview must confirm that baseline before anything is signed.
   */
  const handleConfirm = useCallback(async () => {
    const { quote } = stateRef.current;
    if (!quote || isInFlightRef.current) {
      return;
    }
    isInFlightRef.current = true;
    const intentId = ++intentIdRef.current;
    try {
      await runFlow({
        intentId,
        baselinePrice: quote.sharePrice,
        slippage: quote.slippage,
      });
    } finally {
      isInFlightRef.current = false;
    }
  }, [runFlow]);

  /**
   * Try Again entry point (no-match / timeout / unavailable sheets).
   * Revalidates against the same approved baseline the failed attempt used.
   */
  const handleTryAgain = useCallback(async () => {
    const { baselinePrice, baselineSlippage } = stateRef.current;
    if (
      baselinePrice === null ||
      baselineSlippage === null ||
      isInFlightRef.current
    ) {
      return;
    }
    isInFlightRef.current = true;
    const intentId = ++intentIdRef.current;
    try {
      await runFlow({
        intentId,
        baselinePrice,
        slippage: baselineSlippage,
      });
    } finally {
      isInFlightRef.current = false;
    }
  }, [runFlow]);

  /**
   * Dismissal entry point. Invalidates any in-flight intent, settles idle,
   * and submits nothing.
   */
  const handleDismiss = useCallback(() => {
    intentIdRef.current += 1;
    settleIdle();
  }, [settleIdle]);

  return {
    /** Ref for the pre-submit PredictOrderRetrySheet instance. */
    executionSheetRef,
    /**
     * Variant for the pre-submit sheet: the settled status mapped to its
     * sheet variant, stable across the busy phases.
     */
    sheetVariant: sheetVariantRef.current,
    status: state.status,
    /** Candidate quote shown for confirmation ('confirm' status only). */
    quote: state.quote,
    /** Execution facts for the candidate or failed classification. */
    execution: state.execution,
    /** Approved price baseline of the current sheet state. */
    baselinePrice: state.baselinePrice,
    /** True while a validation fetch or placement is in flight. */
    isExecuting: state.status === 'validating' || state.status === 'submitting',
    handleCashOut,
    handleConfirm,
    handleTryAgain,
    handleDismiss,
  };
}
