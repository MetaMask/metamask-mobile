import { useCallback, useEffect, useRef, useState } from 'react';
import {
  PredictEventValues,
  PredictOneTickDecisionValue,
  PredictRetryOutcomeValue,
  PredictTradeStatus,
} from '../constants/eventNames';
import Engine from '../../../../core/Engine';
import type {
  OrderPreview,
  PlaceOrderParams,
  PredictBuyAttempt,
  PredictRetryOrderState,
} from '../types';
import { isPredictPriceWithinOneTick } from '../utils/prices';
import { sanitizePredictFailureReason } from '../utils/analytics';
import { formatSlippageBand } from '../utils/format';
import type { PlaceOrderOutcome } from './usePredictPlaceOrder';
import type { RefetchPreviewResult } from './usePredictOrderPreview';
import type {
  PredictOrderRetrySheetRef,
  PredictOrderRetrySheetVariant,
} from '../components/PredictOrderRetrySheet';
import { isPredictRetryQuoteVariant } from '../components/PredictOrderRetrySheet/retryContent';

/**
 * Outcome of a custom retry submission. Besides the placement outcomes, a
 * submission that revalidates the quote first can report that the price
 * moved again (with the new candidate), that the book cannot fill the order,
 * or that no price is available. Nothing is placed in those cases.
 */
export type PredictRetrySubmitOutcome =
  | PlaceOrderOutcome
  | { status: 'price_moved'; quote: OrderPreview }
  | { status: 'no_match' }
  | { status: 'empty_book' }
  | { status: 'unavailable' };

interface UsePredictOrderRetryParams {
  preview: OrderPreview | null | undefined;
  /**
   * Re-fetches the live order book and classifies the outcome.
   * Every retry must confirm a freshly fetched quote before submitting.
   */
  refetchPreview: () => Promise<RefetchPreviewResult>;
  /**
   * The preview behind the most recent submit attempt (original order or
   * previous retry). Its price is the 1-tick honesty baseline: a fresh quote
   * more than one tick worse requires an explicit re-confirmation.
   */
  lastSubmittedPreview?: OrderPreview | null;
  placeOrder: (params: PlaceOrderParams) => Promise<PlaceOrderOutcome>;
  /**
   * Replaces the direct placement of the confirmed retry quote. A sell uses
   * it to revalidate the quote against a fresh order book before signing,
   * because the polled retry quote is never signed directly.
   */
  submitRetryQuote?: (
    quote: OrderPreview,
  ) => Promise<PredictRetrySubmitOutcome>;
  analyticsProperties: PlaceOrderParams['analyticsProperties'];
  isOrderNotFilled: boolean;
  resetOrderNotFilled: () => void;
  /**
   * Authoritative state of the order behind the retry, supplied by the
   * screen from its own order-state source. A 'pending', 'filled', or
   * 'canceled' order is never retried as if it were a fresh failure.
   */
  orderState?: PredictRetryOrderState;
  /**
   * True when the host screen is itself a bottom sheet. The retry sheet then
   * never opens, because it would render inside the host sheet: the host
   * shows `retryNotice` inline and runs `handleRetryPrimary` from its main
   * button.
   */
  isSheetMode?: boolean;
  /**
   * Fetches a fresh quote as soon as the order is not filled. Defaults to
   * `!isSheetMode`, where the inline buy-sheet banner asks first.
   */
  autoRetryOnNotFilled?: boolean;
  attempt?: PredictBuyAttempt;
}

/**
 * Classification of a freshly fetched quote against the 1-tick baseline.
 * Keeps the branching out of handleRetry so the flow stays readable.
 */
type FreshQuoteClassification =
  | {
      outcome: 'quoted';
      quote: OrderPreview;
      previousPrice: number | null;
      movedBeyondOneTick: boolean;
      oneTickDecision: PredictOneTickDecisionValue;
    }
  | { outcome: 'no_match' }
  | { outcome: 'unavailable' };

function classifyFreshQuote(
  fetchResult: RefetchPreviewResult,
  referencePrice: number | undefined,
): FreshQuoteClassification {
  switch (fetchResult.status) {
    case 'no_match':
      return { outcome: 'no_match' };
    case 'unavailable':
      return { outcome: 'unavailable' };
    case 'ok': {
      const freshPreview = fetchResult.preview;
      const movedBeyondOneTick =
        referencePrice !== undefined &&
        !isPredictPriceWithinOneTick({
          side: freshPreview.side,
          approvedPrice: referencePrice,
          refreshedPrice: freshPreview.sharePrice,
          tickSize: freshPreview.tickSize,
        });
      return {
        outcome: 'quoted',
        quote: freshPreview,
        previousPrice: referencePrice ?? null,
        movedBeyondOneTick,
        oneTickDecision: movedBeyondOneTick
          ? PredictEventValues.ONE_TICK_DECISION.BEYOND_ONE_TICK
          : PredictEventValues.ONE_TICK_DECISION.WITHIN_ONE_TICK,
      };
    }
  }
}

export function usePredictOrderRetry({
  preview,
  refetchPreview,
  lastSubmittedPreview,
  placeOrder,
  submitRetryQuote,
  analyticsProperties,
  isOrderNotFilled,
  resetOrderNotFilled,
  orderState = 'unknown',
  isSheetMode = false,
  autoRetryOnNotFilled = !isSheetMode,
  attempt,
}: UsePredictOrderRetryParams) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryQuote, setRetryQuote] = useState<OrderPreview | null>(null);
  const [retryPreviousPrice, setRetryPreviousPrice] = useState<number | null>(
    null,
  );
  const [retrySheetVariant, setRetrySheetVariant] =
    useState<PredictOrderRetrySheetVariant>('busy');
  const wasOrderNotFilledRef = useRef(false);
  const retrySheetRef = useRef<PredictOrderRetrySheetRef>(null);
  // Single-flight lock covering the whole retry flow (fetch and submit).
  // Managed exclusively here — never synced from render state — so a double
  // tap cannot slip through between the flip and the next render.
  const isRetryInFlightRef = useRef(false);
  const isOrderNotFilledRef = useRef(false);
  isOrderNotFilledRef.current = isOrderNotFilled;
  // Terminal/in-flight order state must never be retried as a fresh failure.
  const isRetryBlockedRef = useRef(false);
  isRetryBlockedRef.current = orderState !== 'unknown';
  // User-initiated retry submission count within this not-filled episode.
  const retryCountRef = useRef(0);
  // How the 1-tick rule classified the quote currently being confirmed.
  const oneTickDecisionRef = useRef<PredictOneTickDecisionValue>(
    PredictEventValues.ONE_TICK_DECISION.WITHIN_ONE_TICK,
  );

  /**
   * Fetches the fresh quote and moves the sheet to the confirm state.
   * Nothing is submitted here — submission happens on explicit confirmation
   * of the refreshed quote (handleRetryConfirm).
   */
  const handleRetry = useCallback(async () => {
    if (isRetryInFlightRef.current || isRetryBlockedRef.current) {
      return;
    }
    isRetryInFlightRef.current = true;
    // The current state stays visible with a loading action while the fresh
    // quote is fetched.
    setIsRetrying(true);
    try {
      const fetchResult = await refetchPreview();
      // The user may have dismissed the error while the fetch was in flight;
      // never surface a quote for an order that is no longer retryable.
      if (!isOrderNotFilledRef.current || isRetryBlockedRef.current) {
        return;
      }
      const classification = classifyFreshQuote(
        fetchResult,
        lastSubmittedPreview?.sharePrice,
      );
      if (classification.outcome === 'no_match') {
        // Empty/unfillable book: never submit into it — offer try again / later.
        setRetryQuote(null);
        setRetrySheetVariant('no_match');
      } else if (classification.outcome === 'quoted') {
        oneTickDecisionRef.current = classification.oneTickDecision;
        setRetryQuote(classification.quote);
        setRetryPreviousPrice(classification.previousPrice);
        // 1-tick honesty: a move beyond one tick re-confirms the new price
        // explicitly; otherwise the single confirmation proceeds.
        setRetrySheetVariant(
          classification.movedBeyondOneTick ? 'price_moved' : 'confirm',
        );
      } else {
        setRetryQuote(null);
        setRetrySheetVariant('quote_unavailable');
      }
    } catch {
      if (!isOrderNotFilledRef.current || isRetryBlockedRef.current) {
        return;
      }
      setRetryQuote(null);
      setRetrySheetVariant('quote_unavailable');
    } finally {
      isRetryInFlightRef.current = false;
      setIsRetrying(false);
      // The confirmation is tied to the fresh quote: surface it in the sheet,
      // or inline when the host is itself a sheet.
      if (
        !isSheetMode &&
        isOrderNotFilledRef.current &&
        !isRetryBlockedRef.current
      ) {
        retrySheetRef.current?.onOpenBottomSheet();
      }
    }
  }, [refetchPreview, lastSubmittedPreview, isSheetMode]);

  const handleRetryConfirm = useCallback(async () => {
    if (
      !retryQuote ||
      isRetryInFlightRef.current ||
      isRetryBlockedRef.current
    ) {
      return;
    }
    // Flip synchronously — before any await — so a double tap inside the
    // same frame cannot start a second submission.
    isRetryInFlightRef.current = true;
    setIsRetrying(true);
    const retryCount = retryCountRef.current + 1;
    retryCountRef.current = retryCount;
    const oneTickDecision = oneTickDecisionRef.current;
    const slippageBand = formatSlippageBand(retryQuote.slippage);
    const retryReason = PredictEventValues.RETRY_REASON.ORDER_NOT_FILLED;

    const isPredictBuy =
      analyticsProperties?.transactionType ===
      PredictEventValues.TRANSACTION_TYPE.MM_PREDICT_BUY;

    const settleVariant = (variant: PredictOrderRetrySheetVariant) => {
      setRetrySheetVariant(variant);
      if (!isSheetMode) {
        retrySheetRef.current?.onOpenBottomSheet();
      }
    };
    const settleFailed = () => settleVariant('failed');

    let retryOutcome: PredictRetryOutcomeValue | undefined;
    let failureReason: string | undefined;

    try {
      if (!isPredictBuy) {
        void Engine.context.PredictController.trackPredictOrderEvent({
          status: PredictTradeStatus.RETRY_SUBMITTED,
          analyticsProperties,
          sharePrice: retryQuote.sharePrice,
          retryReason,
          retryCount,
          oneTickDecision,
          slippageBand,
        });
      }

      const outcome: PredictRetrySubmitOutcome = submitRetryQuote
        ? await submitRetryQuote(retryQuote)
        : await placeOrder({
            analyticsProperties,
            preview: retryQuote,
            attempt,
          });

      if (
        outcome.status === 'success' ||
        outcome.status === 'deposit_required'
      ) {
        retryOutcome = PredictEventValues.RETRY_OUTCOME.SUCCESS;
        retrySheetRef.current?.onCloseBottomSheet();
        resetOrderNotFilled();
      } else if (outcome.status === 'price_moved') {
        // Revalidation found a price more than one tick worse: nothing was
        // placed, and the new price needs an explicit confirmation.
        retryOutcome = PredictEventValues.RETRY_OUTCOME.FAILED;
        failureReason = 'price_moved';
        oneTickDecisionRef.current =
          PredictEventValues.ONE_TICK_DECISION.BEYOND_ONE_TICK;
        setRetryQuote(outcome.quote);
        setRetryPreviousPrice(retryQuote.sharePrice);
        settleVariant('price_moved');
      } else if (
        outcome.status === 'no_match' ||
        outcome.status === 'empty_book'
      ) {
        retryOutcome = PredictEventValues.RETRY_OUTCOME.NOT_FILLED;
        setRetryQuote(null);
        settleVariant(outcome.status);
      } else if (outcome.status === 'unavailable') {
        retryOutcome = PredictEventValues.RETRY_OUTCOME.FAILED;
        failureReason = 'quote_unavailable';
        setRetryQuote(null);
        settleVariant('quote_unavailable');
      } else {
        // Bounded: this retry attempt is over. The sheet settles in its
        // failed state and nothing further happens until the user taps
        // again — no automatic re-submission loop.
        retryOutcome =
          outcome.status === 'order_not_filled'
            ? PredictEventValues.RETRY_OUTCOME.NOT_FILLED
            : PredictEventValues.RETRY_OUTCOME.FAILED;
        if (outcome.status === 'error') {
          failureReason = sanitizePredictFailureReason(outcome.error);
        }
        settleFailed();
      }
    } catch (error) {
      // placeOrder implementations catch their own errors; a throw here is
      // unexpected — settle in the failed state like any other failure.
      retryOutcome = PredictEventValues.RETRY_OUTCOME.FAILED;
      failureReason = sanitizePredictFailureReason(error);
      settleFailed();
    } finally {
      if (!isPredictBuy && retryOutcome) {
        void Engine.context.PredictController.trackPredictOrderEvent({
          status: PredictTradeStatus.RETRY_COMPLETED,
          analyticsProperties,
          sharePrice: retryQuote.sharePrice,
          retryReason,
          retryCount,
          oneTickDecision,
          slippageBand,
          retryOutcome,
          failureReason,
        });
      }
      isRetryInFlightRef.current = false;
      setIsRetrying(false);
    }
  }, [
    retryQuote,
    placeOrder,
    submitRetryQuote,
    analyticsProperties,
    attempt,
    resetOrderNotFilled,
    isSheetMode,
  ]);

  useEffect(() => {
    if (isRetryInFlightRef.current) {
      wasOrderNotFilledRef.current = isOrderNotFilled;
      return;
    }

    // Terminal/in-flight order: never run the retry flow. Do not consume the
    // not-filled transition — if the order later becomes retryable, the
    // edge fires then.
    if (isRetryBlockedRef.current && !wasOrderNotFilledRef.current) {
      return;
    }

    const becameNotFilled = !wasOrderNotFilledRef.current && isOrderNotFilled;

    if (becameNotFilled) {
      setRetrySheetVariant('busy');

      if (!isSheetMode) {
        retrySheetRef.current?.onOpenBottomSheet();
      }
      if (autoRetryOnNotFilled) {
        void handleRetry();
      }

      if (
        analyticsProperties?.transactionType !==
        PredictEventValues.TRANSACTION_TYPE.MM_PREDICT_BUY
      ) {
        void Engine.context.PredictController.trackPredictOrderEvent({
          status: PredictTradeStatus.RETRY_PROMPTED,
          analyticsProperties,
          sharePrice: preview?.sharePrice,
        });
      }
    } else if (!isOrderNotFilled) {
      // The episode is over — the next not-filled failure starts a new
      // count.
      retryCountRef.current = 0;
      setRetryQuote(null);
    }

    wasOrderNotFilledRef.current = isOrderNotFilled;
  }, [
    isOrderNotFilled,
    orderState,
    analyticsProperties,
    preview?.sharePrice,
    isSheetMode,
    autoRetryOnNotFilled,
    handleRetry,
  ]);

  const isRetryQuoteShown = isPredictRetryQuoteVariant(
    retrySheetVariant,
    retryQuote,
  );

  /** Main-button action for an inline retry state. */
  const handleRetryPrimary = useCallback(
    () => (isRetryQuoteShown ? handleRetryConfirm() : handleRetry()),
    [isRetryQuoteShown, handleRetryConfirm, handleRetry],
  );

  // Inline retry state for sheet hosts. Hidden while a fetch or submission
  // runs, so the host shows its normal content with a loading main button.
  const retryNotice =
    isSheetMode &&
    isOrderNotFilled &&
    !isRetrying &&
    retrySheetVariant !== 'busy'
      ? {
          variant: retrySheetVariant,
          preview: retryQuote,
          previousPrice: retryPreviousPrice,
        }
      : null;

  return {
    retrySheetRef,
    retrySheetVariant,
    retryQuote,
    retryPreviousPrice,
    isRetrying,
    handleRetry,
    handleRetryConfirm,
    handleRetryPrimary,
    retryNotice,
  };
}
