import { useCallback, useEffect, useRef, useState } from 'react';
import Engine from '../../../../core/Engine';
import {
  PredictEventValues,
  PredictTradeStatus,
  type PredictPreSubmitDecisionValue,
  type PredictReconfirmOutcomeValue,
} from '../constants/eventNames';
import {
  PREDICT_ERROR_CODES,
  PREDICT_SELL_PREFLIGHT_ERRORS,
} from '../constants/errors';
import type {
  PredictOrderRetrySheetRef,
  PredictOrderRetrySheetVariant,
} from '../components/PredictOrderRetrySheet';
import type { PlaceOrderOutcome } from './usePredictPlaceOrder';
import type { PredictRetrySubmitOutcome } from './usePredictOrderRetry';
import { getPredictPriceConsent } from '../utils/prices';
import { withPredictSellBandFloorFromSharePrice } from '../utils/execution';
import {
  acquirePredictSellExecutionLock,
  releasePredictSellExecutionLock,
  type PredictSellExecutionLockToken,
} from '../utils/sellExecutionLock';
import { parseErrorMessage } from '../utils/predictErrorHandler';
import {
  Side,
  type OrderPreview,
  type PlaceOrderParams,
  type PredictExecutionMetadata,
  type PredictExecutionPreviewResult,
  type PreviewExecutionOrderParams,
} from '../types';
import { formatSlippageBand } from '../utils/format';

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
   * Its worst case is measured from its own price, which becomes the new
   * baseline on Confirm. It is never signed: Confirm revalidates first.
   */
  quote: OrderPreview | null;
  /** Execution facts for the candidate or failed classification, when present. */
  execution: PredictExecutionMetadata | null;
  /** Approved price baseline the candidate was classified against. */
  baselinePrice: number | null;
  /** Approved slippage band that goes with `baselinePrice`. */
  baselineSlippage: number | null;
  /**
   * Localized message when the sell pre-flight rejected the order (market
   * closed, pending resolution, claimable position). Shown on the screen.
   */
  error: string | null;
}

const IDLE_STATE: PredictSellExecutionState = {
  status: 'idle',
  quote: null,
  execution: null,
  baselinePrice: null,
  baselineSlippage: null,
  error: null,
};

/**
 * Classification of one freshly fetched execution preview against the
 * approved baseline: `submit` (price better/equal/within one tick and the
 * full size executable in band), `confirm` (more than one tick worse —
 * requires an explicit re-confirmation), `blocked` (the pre-flight rejected
 * the order), or a terminal market/transport state that submits nothing.
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
  | { outcome: 'unavailable' }
  | { outcome: 'blocked'; error: string };

type SettledClassification = Exclude<
  ExecutionClassification,
  { outcome: 'submit' }
>;

/** How one validation-and-submission run ended. */
type ExecutionFlowResult =
  | { kind: 'placed'; outcome: PlaceOrderOutcome }
  | { kind: 'settled'; classification: SettledClassification }
  | { kind: 'stale_again' }
  | { kind: 'obsolete' };

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
  /**
   * True when the host screen is itself a bottom sheet. The execution sheet
   * then never opens, because it would render inside the host sheet: the
   * host shows `executionNotice` inline and runs `handleExecutionPrimary`
   * from its main button.
   */
  isSheetMode?: boolean;
}

/** Sheet variant for each settled status. Busy phases (validating,
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

/** Stable pre-submit decision value for each classification outcome. */
const DECISION_FOR_OUTCOME: Record<
  ExecutionClassification['outcome'],
  PredictPreSubmitDecisionValue
> = {
  submit: PredictEventValues.PRE_SUBMIT_DECISION.WITHIN_ONE_TICK,
  confirm: PredictEventValues.PRE_SUBMIT_DECISION.BEYOND_ONE_TICK,
  no_match: PredictEventValues.PRE_SUBMIT_DECISION.NO_MATCH,
  timeout: PredictEventValues.PRE_SUBMIT_DECISION.TIMEOUT,
  unavailable: PredictEventValues.PRE_SUBMIT_DECISION.UNAVAILABLE,
  blocked: PredictEventValues.PRE_SUBMIT_DECISION.UNAVAILABLE,
};

/** Stable pre-submit decision value for the sheet state a dismissal fires from. */
const DECISION_FOR_STATUS: Partial<
  Record<PredictSellExecutionStatus, PredictPreSubmitDecisionValue>
> = {
  confirm: PredictEventValues.PRE_SUBMIT_DECISION.BEYOND_ONE_TICK,
  no_match: PredictEventValues.PRE_SUBMIT_DECISION.NO_MATCH,
  timeout: PredictEventValues.PRE_SUBMIT_DECISION.TIMEOUT,
  unavailable: PredictEventValues.PRE_SUBMIT_DECISION.UNAVAILABLE,
};

/** Which entry started a validation pass. */
type ExecutionFlowOrigin =
  | 'cash_out'
  | 'confirm'
  | 'try_again'
  | 'post_failure_retry'
  | 'stale_recovery';

/**
 * Re-confirm outcome for a classified pass, given the flow origin: how the
 * confirmation episode the pass belongs to resolved. Non-confirm origins
 * have no confirmation episode, and terminal market/transport states settle
 * without an order submission.
 */
const getReconfirmOutcome = (
  classification: ExecutionClassification,
  origin: ExecutionFlowOrigin,
): PredictReconfirmOutcomeValue | undefined => {
  switch (classification.outcome) {
    case 'submit':
    case 'confirm':
      if (origin === 'confirm') {
        return classification.outcome === 'submit'
          ? PredictEventValues.RECONFIRM_OUTCOME.CONFIRMED
          : PredictEventValues.RECONFIRM_OUTCOME.REFRESHED_AGAIN;
      }
      if (origin === 'stale_recovery' && classification.outcome === 'submit') {
        return PredictEventValues.RECONFIRM_OUTCOME.STALE_RECOVERED;
      }
      return undefined;
    default:
      return PredictEventValues.RECONFIRM_OUTCOME.NOT_SUBMITTED;
  }
};

/**
 * Emits the pre-submit decision on the existing Predict order lifecycle
 * event: the classification together with the exact facts it was decided
 * from. A no-match is a terminal market outcome (`failure_category =
 * no_match` with the partial execution facts), never a technical
 * order-submission failure, and carries no order IDs.
 */
const trackPreSubmitDecision = ({
  analyticsProperties,
  size,
  baselinePrice,
  slippage,
  origin,
  classification,
}: {
  analyticsProperties: PlaceOrderParams['analyticsProperties'];
  size: number;
  baselinePrice: number;
  slippage: number;
  origin: ExecutionFlowOrigin;
  classification: ExecutionClassification;
}): void => {
  const execution: PredictExecutionMetadata | null =
    'execution' in classification ? classification.execution : null;
  void Engine.context.PredictController.trackPredictOrderEvent({
    status: PredictTradeStatus.PRESUBMIT_DECIDED,
    analyticsProperties,
    sharePrice:
      classification.outcome === 'submit' ||
      classification.outcome === 'confirm'
        ? classification.preview.sharePrice
        : undefined,
    quoteAgeMs: execution ? Date.now() - execution.fetchedAt : undefined,
    requestedSize: size,
    executableSize: execution?.executableSize,
    approvedPrice: baselinePrice,
    refreshedPrice: execution?.refreshedPrice,
    worstExecutablePrice: execution?.worstExecutablePrice,
    bandFloorPrice: execution?.bandFloorPrice,
    tickSize: execution?.tickSize,
    slippageBand: formatSlippageBand(slippage),
    preSubmitDecision: DECISION_FOR_OUTCOME[classification.outcome],
    reconfirmOutcome: getReconfirmOutcome(classification, origin),
    ...(classification.outcome === 'no_match' && {
      failureCategory: PredictEventValues.FAILURE_CATEGORY.NO_MATCH,
    }),
    ...(classification.outcome === 'blocked' && {
      failureReason: classification.error,
    }),
  });
};

const toPreflightErrorMessage = (errorCode: string): string =>
  parseErrorMessage({
    error: new Error(errorCode),
    defaultCode: PREDICT_ERROR_CODES.PLACE_ORDER_FAILED,
  });

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
  isSheetMode = false,
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
  const isMountedRef = useRef(true);
  // Generation identity: bumped on every user action and on dismissal so
  // late responses from an obsolete intent are discarded.
  const intentIdRef = useRef(0);
  // The in-flight run: its fetch can be cancelled, and its lock released
  // early, while it is still validating.
  const activeRunRef = useRef<{
    abortController: AbortController;
    lockKey: string;
    lockToken: PredictSellExecutionLockToken;
    isSubmitting: boolean;
  } | null>(null);
  // Set when the flow closes its own sheet, so the sheet's close callback is
  // not mistaken for a user dismissal of a newer flow.
  const isClosingSheetRef = useRef(false);
  const sellPositionKey =
    positionId ?? `${marketId}:${outcomeId}:${outcomeTokenId}`;

  /** Cancels a run that has not started placement yet. */
  const cancelValidatingRun = useCallback(() => {
    const activeRun = activeRunRef.current;
    if (!activeRun || activeRun.isSubmitting) {
      return;
    }
    activeRun.abortController.abort();
    releasePredictSellExecutionLock(activeRun.lockKey, activeRun.lockToken);
    activeRunRef.current = null;
  }, []);

  useEffect(
    () => () => {
      isMountedRef.current = false;
      intentIdRef.current += 1;
      cancelValidatingRun();
    },
    [cancelValidatingRun],
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

  const openSheet = useCallback(() => {
    if (isSheetMode) {
      return;
    }
    isClosingSheetRef.current = false;
    executionSheetRef.current?.onOpenBottomSheet();
  }, [isSheetMode]);

  const closeSheet = useCallback(() => {
    if (isSheetMode) {
      return;
    }
    isClosingSheetRef.current = true;
    executionSheetRef.current?.onCloseBottomSheet();
  }, [isSheetMode]);

  /**
   * Fetches one fresh execution preview and classifies it against the
   * approved baseline. Never touches state: intent currency is checked by
   * the caller between the await points.
   */
  const fetchClassification = useCallback(
    async ({
      baselinePrice,
      slippage,
      signal,
    }: {
      baselinePrice: number;
      slippage: number;
      signal: AbortSignal;
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
          signal,
          ...(positionId ? { positionId } : {}),
        });
      } catch (error) {
        if (
          error instanceof Error &&
          PREDICT_SELL_PREFLIGHT_ERRORS.has(error.message)
        ) {
          return { outcome: 'blocked', error: error.message };
        }
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
            tickSize: result.execution.tickSize ?? result.preview.tickSize,
          });
          return consent.withinOneTick
            ? {
                outcome: 'submit',
                preview: result.preview,
                execution: result.execution,
              }
            : {
                outcome: 'confirm',
                preview: withPredictSellBandFloorFromSharePrice(result.preview),
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
   * Validation and submission for one user action: fetch + classify, then
   * submit when acceptable. Runs at most twice — the second pass is the
   * single bounded stale-signing recovery against the same approved baseline.
   */
  const executeFlow = useCallback(
    async ({
      intentId,
      baselinePrice,
      slippage,
      origin,
      onValidating,
      onSubmitting,
    }: {
      intentId: number;
      baselinePrice: number;
      slippage: number;
      origin: Exclude<ExecutionFlowOrigin, 'stale_recovery'>;
      onValidating?: () => void;
      onSubmitting?: (
        classification: Extract<ExecutionClassification, { outcome: 'submit' }>,
      ) => void;
    }): Promise<ExecutionFlowResult> => {
      const isCurrentIntent = () =>
        intentIdRef.current === intentId && isMountedRef.current;
      let staleRecoveryUsed = false;
      let currentOrigin: ExecutionFlowOrigin = origin;

      for (;;) {
        const activeRun = activeRunRef.current;
        if (!activeRun) {
          return { kind: 'obsolete' };
        }
        onValidating?.();

        const classification = await fetchClassification({
          baselinePrice,
          slippage,
          signal: activeRun.abortController.signal,
        });
        if (!isCurrentIntent()) {
          return { kind: 'obsolete' };
        }

        // Analytics: the pre-submit decision with the exact facts it was
        // decided from. Emission only — never a decision input.
        trackPreSubmitDecision({
          analyticsProperties,
          size,
          baselinePrice,
          slippage,
          origin: currentOrigin,
          classification,
        });

        if (classification.outcome !== 'submit') {
          return { kind: 'settled', classification };
        }

        // Price consent passed: submit the exact fresh preview. From here
        // the run can no longer be cancelled.
        activeRun.isSubmitting = true;
        onSubmitting?.(classification);
        const outcome = await placeOrder({
          analyticsProperties,
          preview: classification.preview,
        });
        activeRun.isSubmitting = false;
        if (!isCurrentIntent()) {
          return { kind: 'obsolete' };
        }

        if (outcome.status !== 'preview_stale') {
          return { kind: 'placed', outcome };
        }
        if (staleRecoveryUsed) {
          return { kind: 'stale_again' };
        }
        // One bounded recovery: repeat validation + submission once against
        // the same user-approved baseline.
        staleRecoveryUsed = true;
        currentOrigin = 'stale_recovery';
      }
    },
    [fetchClassification, placeOrder, analyticsProperties, size],
  );

  /**
   * Runs `run` while holding the position lock and owning a cancellable
   * fetch. Returns null when another flow already holds the lock.
   */
  const withLockedRun = useCallback(
    async <T>(run: (intentId: number) => Promise<T>): Promise<T | null> => {
      const lockToken = acquirePredictSellExecutionLock(sellPositionKey);
      if (!lockToken) {
        return null;
      }
      const intentId = ++intentIdRef.current;
      const activeRun = {
        abortController: new AbortController(),
        lockKey: sellPositionKey,
        lockToken,
        isSubmitting: false,
      };
      activeRunRef.current = activeRun;
      try {
        return await run(intentId);
      } finally {
        releasePredictSellExecutionLock(sellPositionKey, lockToken);
        if (activeRunRef.current === activeRun) {
          activeRunRef.current = null;
        }
      }
    },
    [sellPositionKey],
  );

  const settleSheet = useCallback(
    (classification: SettledClassification) => {
      switch (classification.outcome) {
        case 'blocked':
          closeSheet();
          setState({
            ...IDLE_STATE,
            error: toPreflightErrorMessage(classification.error),
          });
          return;
        case 'confirm':
          updateState({
            status: 'confirm',
            quote: classification.preview,
            execution: classification.execution,
          });
          break;
        case 'no_match':
          updateState({
            status: 'no_match',
            quote: null,
            execution: classification.execution,
          });
          break;
        default:
          updateState({
            status: classification.outcome,
            quote: null,
            execution: null,
          });
      }
      openSheet();
    },
    [closeSheet, openSheet, updateState],
  );

  /** Sheet-driven flow: Cash Out, Confirm, and Try Again entry points. */
  const runSheetFlow = useCallback(
    async ({
      baselinePrice,
      slippage,
      origin,
    }: {
      baselinePrice: number;
      slippage: number;
      origin: 'cash_out' | 'confirm' | 'try_again';
    }): Promise<void> => {
      await withLockedRun(async (intentId) => {
        const result = await executeFlow({
          intentId,
          baselinePrice,
          slippage,
          origin,
          // The candidate quote and execution facts stay visible while an
          // already-open confirm sheet waits on this fetch; only a new
          // settled state replaces or clears them.
          onValidating: () =>
            updateState({
              status: 'validating',
              baselinePrice,
              baselineSlippage: slippage,
              error: null,
            }),
          onSubmitting: (classification) =>
            updateState({
              status: 'submitting',
              quote: classification.preview,
              execution: classification.execution,
            }),
        });

        switch (result.kind) {
          case 'obsolete':
            return;
          case 'placed':
            // Terminal placement outcome: usePredictPlaceOrder owns result UX
            // (toasts, post-failure retry lifecycle, screen pop); the
            // pre-submit flow settles and closes its sheet.
            closeSheet();
            settleIdle();
            return;
          case 'stale_again':
            // A second stale rejection settles unavailable: never loop.
            settleSheet({ outcome: 'unavailable' });
            return;
          case 'settled':
            settleSheet(result.classification);
        }
      });
    },
    [
      withLockedRun,
      executeFlow,
      updateState,
      closeSheet,
      settleIdle,
      settleSheet,
    ],
  );

  /**
   * Cash Out entry point. The displayed preview's price is the approved
   * baseline; a fresh execution preview must confirm it before anything is
   * signed.
   */
  const handleCashOut = useCallback(async () => {
    if (!preview) {
      return;
    }
    await runSheetFlow({
      baselinePrice: preview.sharePrice,
      slippage: preview.slippage,
      origin: 'cash_out',
    });
  }, [preview, runSheetFlow]);

  /**
   * Confirm entry point (price-moved sheet). Pressing Confirm adopts the
   * displayed candidate quote as the new approved baseline, then a fresh
   * execution preview must confirm that baseline before anything is signed.
   */
  const handleConfirm = useCallback(async () => {
    const { quote } = stateRef.current;
    if (!quote) {
      return;
    }
    await runSheetFlow({
      baselinePrice: quote.sharePrice,
      slippage: quote.slippage,
      origin: 'confirm',
    });
  }, [runSheetFlow]);

  /**
   * Try Again entry point (no-match / timeout / unavailable sheets).
   * Revalidates against the same approved baseline the failed attempt used.
   */
  const handleTryAgain = useCallback(async () => {
    const { baselinePrice, baselineSlippage } = stateRef.current;
    if (baselinePrice === null || baselineSlippage === null) {
      return;
    }
    await runSheetFlow({
      baselinePrice,
      slippage: baselineSlippage,
      origin: 'try_again',
    });
  }, [runSheetFlow]);

  /**
   * Post-failure retry submission (order not filled). The polled retry quote
   * the user confirmed is the approved baseline; a fresh execution preview
   * must confirm it before anything is signed. Opens no sheet of its own:
   * the retry sheet shows the outcome.
   */
  const submitRetryQuote = useCallback(
    async (quote: OrderPreview): Promise<PredictRetrySubmitOutcome> => {
      const outcome = await withLockedRun(
        async (intentId): Promise<PredictRetrySubmitOutcome> => {
          const result = await executeFlow({
            intentId,
            baselinePrice: quote.sharePrice,
            slippage: quote.slippage,
            origin: 'post_failure_retry',
          });
          switch (result.kind) {
            case 'placed':
              return result.outcome;
            case 'settled': {
              const { classification } = result;
              switch (classification.outcome) {
                case 'confirm':
                  return {
                    status: 'price_moved',
                    quote: classification.preview,
                  };
                case 'no_match':
                  return { status: 'no_match' };
                case 'blocked':
                  return {
                    status: 'error',
                    error: toPreflightErrorMessage(classification.error),
                  };
                default:
                  return { status: 'unavailable' };
              }
            }
            default:
              return { status: 'unavailable' };
          }
        },
      );
      return outcome ?? { status: 'unavailable' };
    },
    [withLockedRun, executeFlow],
  );

  /**
   * Dismissal entry point. Invalidates any in-flight intent, cancels a fetch
   * that is still validating, settles idle, and submits nothing.
   */
  const handleDismiss = useCallback(() => {
    if (isClosingSheetRef.current) {
      // The flow closed its own sheet after it settled: not a user action.
      isClosingSheetRef.current = false;
      return;
    }
    intentIdRef.current += 1;
    cancelValidatingRun();
    const { status, execution, baselinePrice, baselineSlippage } =
      stateRef.current;
    const preSubmitDecision = DECISION_FOR_STATUS[status];
    // Dismissal analytics fire only from a settled sheet state.
    if (preSubmitDecision) {
      void Engine.context.PredictController.trackPredictOrderEvent({
        status: PredictTradeStatus.PRESUBMIT_DISMISSED,
        analyticsProperties,
        quoteAgeMs: execution ? Date.now() - execution.fetchedAt : undefined,
        requestedSize: size,
        executableSize: execution?.executableSize,
        approvedPrice: baselinePrice ?? undefined,
        refreshedPrice: execution?.refreshedPrice,
        worstExecutablePrice: execution?.worstExecutablePrice,
        bandFloorPrice: execution?.bandFloorPrice,
        tickSize: execution?.tickSize,
        slippageBand:
          baselineSlippage === null
            ? undefined
            : formatSlippageBand(baselineSlippage),
        preSubmitDecision,
        reconfirmOutcome: PredictEventValues.RECONFIRM_OUTCOME.DISMISSED,
      });
    }
    settleIdle();
  }, [analyticsProperties, size, settleIdle, cancelValidatingRun]);

  /** Main-button action: the next step of a settled state, else Cash Out. */
  const handleExecutionPrimary = useCallback(() => {
    switch (stateRef.current.status) {
      case 'confirm':
        return handleConfirm();
      case 'no_match':
      case 'timeout':
      case 'unavailable':
        return handleTryAgain();
      default:
        return handleCashOut();
    }
  }, [handleConfirm, handleTryAgain, handleCashOut]);

  const settledVariant = EXECUTION_SHEET_VARIANTS[state.status];
  // Inline settled state for sheet hosts. Hidden while a fetch or placement
  // runs, so the host shows its normal content with a loading main button.
  const executionNotice =
    isSheetMode && settledVariant
      ? {
          variant: settledVariant,
          quote: state.quote,
          previousPrice: state.baselinePrice,
          expectedSize: state.execution?.executableSize ?? null,
        }
      : null;

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
    /** Localized pre-flight rejection to show on the screen, if any. */
    error: state.error,
    /** True while a validation fetch or placement is in flight. */
    isExecuting: state.status === 'validating' || state.status === 'submitting',
    /** True while the order is being placed; it can no longer be cancelled. */
    isSubmitting: state.status === 'submitting',
    handleCashOut,
    handleConfirm,
    handleTryAgain,
    handleDismiss,
    handleExecutionPrimary,
    /** Settled state to show inline when the host is a sheet, else null. */
    executionNotice,
    submitRetryQuote,
  };
}
