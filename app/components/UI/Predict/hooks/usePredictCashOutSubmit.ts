import { useCallback, useEffect, useRef, useState } from 'react';
import Engine from '../../../../core/Engine';
import {
  PredictEventValues,
  PredictTradeStatus,
  type PredictPresubmitOutcomeValue,
} from '../constants/eventNames';
import type { OrderPreview, PlaceOrderParams } from '../types';
import { getPredictSellSubmitDecision } from '../utils/prices';
import type { PlaceOrderOutcome } from './usePredictPlaceOrder';
import type { RefetchPreviewResult } from './usePredictOrderPreview';
import type {
  PredictOrderRetrySheetRef,
  PredictOrderRetrySheetVariant,
} from '../components/PredictOrderRetrySheet';

/** How long Cash Out waits for the fresh order book before giving up. */
export const CASH_OUT_PRICE_CHECK_TIMEOUT_MS = 4000;

export type PredictCashOutSheetVariant = Extract<
  PredictOrderRetrySheetVariant,
  'price_moved' | 'no_match' | 'quote_unavailable' | 'timeout'
>;

type PriceCheckResult = RefetchPreviewResult | { status: 'timeout' };

const { PRESUBMIT_OUTCOME } = PredictEventValues;

function getPresubmitOutcome(
  result: PriceCheckResult,
  approvedPrice: number,
): PredictPresubmitOutcomeValue {
  switch (result.status) {
    case 'timeout':
      return PRESUBMIT_OUTCOME.TIMEOUT;
    case 'unavailable':
      return PRESUBMIT_OUTCOME.QUOTE_UNAVAILABLE;
    case 'no_match':
      return PRESUBMIT_OUTCOME.NO_MATCH;
    case 'ok': {
      const decision = getPredictSellSubmitDecision({
        approvedPrice,
        freshPreview: result.preview,
      });
      if (decision === 'submit') {
        return PRESUBMIT_OUTCOME.SUBMITTED;
      }
      return decision === 'price_moved'
        ? PRESUBMIT_OUTCOME.PRICE_MOVED
        : PRESUBMIT_OUTCOME.NO_MATCH;
    }
  }
}

async function fetchWithDeadline(
  refetchPreview: () => Promise<RefetchPreviewResult>,
): Promise<PriceCheckResult> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<PriceCheckResult>((resolve) => {
    timer = setTimeout(
      () => resolve({ status: 'timeout' }),
      CASH_OUT_PRICE_CHECK_TIMEOUT_MS,
    );
  });
  try {
    return await Promise.race([
      refetchPreview().catch(
        (): PriceCheckResult => ({ status: 'unavailable' }),
      ),
      deadline,
    ]);
  } finally {
    clearTimeout(timer);
  }
}

interface PredictSellPriceCheck {
  outcome: PredictPresubmitOutcomeValue;
  /** The re-fetched preview; null when the book could not be fetched. */
  freshPreview: OrderPreview | null;
}

/**
 * Re-fetches the order book (up to CASH_OUT_PRICE_CHECK_TIMEOUT_MS) and
 * decides a sell against the price the user approved. Never throws.
 */
export async function checkPredictSellPrice(
  refetchPreview: () => Promise<RefetchPreviewResult>,
  approvedPrice: number,
): Promise<PredictSellPriceCheck> {
  const result = await fetchWithDeadline(refetchPreview);
  return {
    outcome: getPresubmitOutcome(result, approvedPrice),
    freshPreview: result.status === 'ok' ? result.preview : null,
  };
}

/** The sheet for a check that blocked the sell with no new price to confirm. */
export function getPredictSellBlockedVariant(
  outcome: PredictPresubmitOutcomeValue,
): PredictCashOutSheetVariant {
  if (outcome === PRESUBMIT_OUTCOME.TIMEOUT) {
    return 'timeout';
  }
  if (outcome === PRESUBMIT_OUTCOME.QUOTE_UNAVAILABLE) {
    return 'quote_unavailable';
  }
  return 'no_match';
}

interface UsePredictCashOutSubmitParams {
  /** The preview on screen; its price is what the user approves on Cash Out. */
  preview: OrderPreview | null | undefined;
  /** Re-fetches the live order book and rebuilds the preview. */
  refetchPreview: () => Promise<RefetchPreviewResult>;
  placeOrder: (params: PlaceOrderParams) => Promise<PlaceOrderOutcome>;
  analyticsProperties: PlaceOrderParams['analyticsProperties'];
}

/**
 * Cash Out never signs the polled preview. Every attempt re-fetches the order
 * book and decides against the price the user approved.
 *
 * A fresh price that is better, equal, or at most one tick worse submits the
 * fresh preview. A move of more than one tick asks the user to confirm the new
 * price, and confirming runs the same check again against that price. No
 * in-band liquidity, a failed fetch, or a timeout submits nothing.
 */
export function usePredictCashOutSubmit({
  preview,
  refetchPreview,
  placeOrder,
  analyticsProperties,
}: UsePredictCashOutSubmitParams) {
  const [isCheckingPrice, setIsCheckingPrice] = useState(false);
  const [sheetVariant, setSheetVariant] =
    useState<PredictCashOutSheetVariant>('quote_unavailable');
  const [sheetQuote, setSheetQuote] = useState<OrderPreview | null>(null);
  const [sheetPreviousPrice, setSheetPreviousPrice] = useState<number | null>(
    null,
  );
  const sheetRef = useRef<PredictOrderRetrySheetRef>(null);
  // Single-flight lock for the whole attempt (fetch and submit). Flipped
  // before any await so a double tap cannot start a second attempt.
  const isInFlightRef = useRef(false);
  // Bumped when the sheet is closed or the screen is left so an in-flight
  // check is ignored.
  const attemptIdRef = useRef(0);
  // The price the last attempt was checked against; "Try again" reuses it.
  const approvedPriceRef = useRef<number | null>(null);

  const showSheet = useCallback(
    (
      variant: PredictCashOutSheetVariant,
      quote: OrderPreview | null = null,
    ) => {
      setSheetVariant(variant);
      setSheetQuote(quote);
      sheetRef.current?.onOpenBottomSheet();
    },
    [],
  );

  const runCashOut = useCallback(
    async (approvedPrice: number, reconfirmed = false) => {
      if (isInFlightRef.current) {
        return;
      }
      isInFlightRef.current = true;
      approvedPriceRef.current = approvedPrice;
      const attemptId = ++attemptIdRef.current;
      const startedAt = Date.now();
      setIsCheckingPrice(true);

      try {
        const { outcome, freshPreview } = await checkPredictSellPrice(
          refetchPreview,
          approvedPrice,
        );
        if (attemptId !== attemptIdRef.current) {
          return;
        }

        void Engine.context.PredictController.trackPredictOrderEvent({
          status: PredictTradeStatus.PRESUBMIT_CHECKED,
          analyticsProperties,
          sharePrice: freshPreview?.sharePrice,
          completionDuration: Date.now() - startedAt,
          presubmitOutcome: outcome,
          approvedPrice,
          worstFillPrice: freshPreview?.worstFillPrice,
          reconfirmed,
        });

        if (outcome === PRESUBMIT_OUTCOME.SUBMITTED && freshPreview) {
          sheetRef.current?.onCloseBottomSheet();
          await placeOrder({ analyticsProperties, preview: freshPreview });
        } else if (outcome === PRESUBMIT_OUTCOME.PRICE_MOVED && freshPreview) {
          setSheetPreviousPrice(approvedPrice);
          showSheet('price_moved', freshPreview);
        } else {
          showSheet(getPredictSellBlockedVariant(outcome));
        }
      } finally {
        isInFlightRef.current = false;
        setIsCheckingPrice(false);
      }
    },
    [refetchPreview, placeOrder, analyticsProperties, showSheet],
  );

  /** Cash Out button: checks the fresh book against the price on screen. */
  const cashOut = useCallback(async () => {
    if (!preview) {
      return;
    }
    await runCashOut(preview.sharePrice);
  }, [preview, runCashOut]);

  /** Sheet "Try again": checks again against the same approved price. */
  const retryCashOut = useCallback(async () => {
    if (approvedPriceRef.current === null) {
      return;
    }
    await runCashOut(approvedPriceRef.current);
  }, [runCashOut]);

  /** Sheet "Yes, sell at …": the user approves the new price, check again. */
  const confirmCashOut = useCallback(async () => {
    if (!sheetQuote) {
      return;
    }
    await runCashOut(sheetQuote.sharePrice, true);
  }, [sheetQuote, runCashOut]);

  const dismissCashOut = useCallback(() => {
    attemptIdRef.current += 1;
  }, []);

  // Leaving the screen during a check submits nothing.
  useEffect(() => dismissCashOut, [dismissCashOut]);

  return {
    cashOut,
    isCheckingPrice,
    sheetRef,
    sheetVariant,
    sheetQuote,
    sheetPreviousPrice,
    retryCashOut,
    confirmCashOut,
    dismissCashOut,
  };
}
