import { useCallback, useRef, useState } from 'react';
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
  // Bumped when the sheet is dismissed so an in-flight check is ignored.
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
    async (approvedPrice: number) => {
      if (isInFlightRef.current) {
        return;
      }
      isInFlightRef.current = true;
      approvedPriceRef.current = approvedPrice;
      const attemptId = ++attemptIdRef.current;
      setIsCheckingPrice(true);

      try {
        const result = await fetchWithDeadline(refetchPreview);
        if (attemptId !== attemptIdRef.current) {
          return;
        }
        if (result.status === 'timeout') {
          showSheet('timeout');
          return;
        }
        if (result.status === 'unavailable') {
          showSheet('quote_unavailable');
          return;
        }
        if (result.status === 'no_match') {
          showSheet('no_match');
          return;
        }

        const freshPreview = result.preview;
        const decision = getPredictSellSubmitDecision({
          approvedPrice,
          freshPreview,
        });
        if (decision === 'no_match') {
          showSheet('no_match');
          return;
        }
        if (decision === 'price_moved') {
          setSheetPreviousPrice(approvedPrice);
          showSheet('price_moved', freshPreview);
          return;
        }

        sheetRef.current?.onCloseBottomSheet();
        await placeOrder({ analyticsProperties, preview: freshPreview });
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
    await runCashOut(sheetQuote.sharePrice);
  }, [sheetQuote, runCashOut]);

  const dismissCashOut = useCallback(() => {
    attemptIdRef.current += 1;
  }, []);

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
