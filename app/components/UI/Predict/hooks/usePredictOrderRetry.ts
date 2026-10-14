import { useCallback, useEffect, useRef, useState } from 'react';
import {
  PredictEventValues,
  PredictTradeStatus,
} from '../constants/eventNames';
import Engine from '../../../../core/Engine';
import type {
  OrderPreview,
  PlaceOrderParams,
  PredictBuyAttempt,
} from '../types';
import type { PlaceOrderOutcome } from './usePredictPlaceOrder';
import type {
  PredictOrderRetrySheetRef,
  PredictOrderRetrySheetVariant,
} from '../components/PredictOrderRetrySheet';

interface UsePredictOrderRetryParams {
  preview: OrderPreview | null | undefined;
  /**
   * Re-fetches the live order book and resolves with the fresh preview.
   * Every retry must confirm a freshly fetched quote before submitting.
   */
  refetchPreview: () => Promise<OrderPreview | null>;
  placeOrder: (params: PlaceOrderParams) => Promise<PlaceOrderOutcome>;
  analyticsProperties: PlaceOrderParams['analyticsProperties'];
  isOrderNotFilled: boolean;
  resetOrderNotFilled: () => void;
  /**
   * When true, suppresses the dedicated PredictOrderRetrySheet overlay on the
   * not-filled transition so the inline buy-sheet error banner can handle the
   * retry UX instead. User-initiated retries always open the sheet.
   */
  isSheetMode?: boolean;
  attempt?: PredictBuyAttempt;
}

export function usePredictOrderRetry({
  preview,
  refetchPreview,
  placeOrder,
  analyticsProperties,
  isOrderNotFilled,
  resetOrderNotFilled,
  isSheetMode = false,
  attempt,
}: UsePredictOrderRetryParams) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryQuote, setRetryQuote] = useState<OrderPreview | null>(null);
  const [retrySheetVariant, setRetrySheetVariant] =
    useState<PredictOrderRetrySheetVariant>('busy');
  const wasOrderNotFilledRef = useRef(false);
  const retrySheetRef = useRef<PredictOrderRetrySheetRef>(null);
  const isRetryingRef = useRef(false);
  isRetryingRef.current = isRetrying;
  const isOrderNotFilledRef = useRef(false);
  isOrderNotFilledRef.current = isOrderNotFilled;

  /**
   * Fetches the fresh quote and moves the sheet to the confirm state.
   * Nothing is submitted here — submission happens on explicit confirmation
   * of the refreshed quote (handleRetryConfirm).
   */
  const handleRetry = useCallback(async () => {
    setRetrySheetVariant('busy');
    try {
      const freshPreview = await refetchPreview();
      // The user may have dismissed the error while the fetch was in flight;
      // never surface a quote for an order that is no longer retryable.
      if (!isOrderNotFilledRef.current) {
        return;
      }
      if (!freshPreview) {
        setRetryQuote(null);
        setRetrySheetVariant('quote_unavailable');
      } else {
        setRetryQuote(freshPreview);
        setRetrySheetVariant('confirm');
      }
    } catch {
      if (!isOrderNotFilledRef.current) {
        return;
      }
      setRetryQuote(null);
      setRetrySheetVariant('quote_unavailable');
    } finally {
      // This is a user-initiated retry: always surface the refreshed quote
      // sheet so the confirmation is tied to the fresh quote.
      if (isOrderNotFilledRef.current) {
        retrySheetRef.current?.onOpenBottomSheet();
      }
    }
  }, [refetchPreview]);

  const handleRetryConfirm = useCallback(async () => {
    if (!retryQuote) return;
    setIsRetrying(true);

    const isPredictBuy =
      analyticsProperties?.transactionType ===
      PredictEventValues.TRANSACTION_TYPE.MM_PREDICT_BUY;

    if (!isPredictBuy) {
      Engine.context.PredictController.trackPredictOrderEvent({
        status: PredictTradeStatus.RETRY_SUBMITTED,
        analyticsProperties,
        sharePrice: retryQuote.sharePrice,
      });
    }

    try {
      const outcome = await placeOrder({
        analyticsProperties,
        preview: retryQuote,
        attempt,
      });

      if (
        outcome.status === 'success' ||
        outcome.status === 'deposit_required'
      ) {
        retrySheetRef.current?.onCloseBottomSheet();
        resetOrderNotFilled();
        return;
      }

      throw new Error('Order not successful');
    } catch {
      setRetrySheetVariant('failed');
      if (!isSheetMode) {
        retrySheetRef.current?.onOpenBottomSheet();
      }
    } finally {
      setIsRetrying(false);
    }
  }, [
    retryQuote,
    placeOrder,
    analyticsProperties,
    attempt,
    resetOrderNotFilled,
    isSheetMode,
  ]);

  useEffect(() => {
    if (isRetryingRef.current) {
      wasOrderNotFilledRef.current = isOrderNotFilled;
      return;
    }

    const becameNotFilled = !wasOrderNotFilledRef.current && isOrderNotFilled;

    if (becameNotFilled) {
      setRetrySheetVariant('busy');

      // Sheet mode renders an inline banner instead of opening the overlay;
      // the banner CTA drives the fetch + confirm flow.
      if (!isSheetMode) {
        retrySheetRef.current?.onOpenBottomSheet();
        handleRetry();
      }

      if (
        analyticsProperties?.transactionType !==
        PredictEventValues.TRANSACTION_TYPE.MM_PREDICT_BUY
      ) {
        Engine.context.PredictController.trackPredictOrderEvent({
          status: PredictTradeStatus.RETRY_PROMPTED,
          analyticsProperties,
          sharePrice: preview?.sharePrice,
        });
      }
    } else if (!isOrderNotFilled) {
      setRetryQuote(null);
    }

    wasOrderNotFilledRef.current = isOrderNotFilled;
  }, [
    isOrderNotFilled,
    analyticsProperties,
    preview?.sharePrice,
    isSheetMode,
    handleRetry,
  ]);

  return {
    retrySheetRef,
    retrySheetVariant,
    retryQuote,
    isRetrying,
    handleRetry,
    handleRetryConfirm,
  };
}
