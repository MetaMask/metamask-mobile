import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { strings } from '../../../../../../../locales/i18n';
import { MINIMUM_BET } from '../../../constants/transactions';
import { usePredictActiveOrder } from '../../../hooks/usePredictActiveOrder';
import { usePredictPaymentToken } from '../../../hooks/usePredictPaymentToken';
import { OrderPreview, PlaceOrderParams } from '../../../types';
import { formatCents, formatPrice } from '../../../utils/format';
import { getPlaceOrderErrorOutcome } from '../../../utils/predictErrorHandler';
import type { PredictBuyErrorBannerVariant } from '../components/PredictBuyErrorBanner';
import { usePredictBuyAvailableBalance } from './usePredictBuyAvailableBalance';

export interface PredictBuyErrorBannerData {
  variant: PredictBuyErrorBannerVariant;
  title: string;
  description: string;
}

export type PredictBuyErrorMessageSource =
  | 'preview'
  | 'below_minimum'
  | 'insufficient_balance'
  | 'blocking_pay_alert'
  | 'order_error';

type PredictBuyErrorResult =
  | {
      status: 'error';
      error: string;
      source: 'blocking_pay_alert' | 'order_error';
    }
  | {
      status: 'order_not_filled';
      source: 'order_error';
    };

interface PredictBuyErrorMessageData {
  message: string;
  source: PredictBuyErrorMessageSource;
}

interface UsePredictBuyInfoParams {
  preview?: OrderPreview | null;
  previewError: string | null;
  isConfirming: boolean;
  isPlacingOrder: boolean;
  isBelowMinimum: boolean;
  isInsufficientBalance: boolean;
  maxBetAmount: number;
  isPayFeesLoading: boolean;
  blockingPayAlertMessage: string | null;
  outcomeTokenPrice?: number;
  // Inline banner UX (price_changed / order_failed) only exists inside the
  // bottom-sheet flow. In legacy full-screen mode we keep the previous
  // surface: an inline error string returned via `errorMessage`. Defaults to
  // false so callers that haven't opted in retain legacy behaviour.
  isSheetMode?: boolean;
}

export const usePredictBuyError = ({
  preview,
  previewError,
  isConfirming,
  isPlacingOrder,
  isBelowMinimum,
  isInsufficientBalance,
  maxBetAmount,
  isPayFeesLoading,
  blockingPayAlertMessage,
  outcomeTokenPrice,
  isSheetMode = false,
}: UsePredictBuyInfoParams) => {
  const { activeOrder, clearOrderError } = usePredictActiveOrder();
  const { isBalanceLoading } = usePredictBuyAvailableBalance();
  const [isOrderNotFilled, setIsOrderNotFilled] = useState(false);
  const [persistedBuyErrorBanner, setPersistedBuyErrorBanner] =
    useState<PredictBuyErrorBannerData | null>(null);
  const { isPredictBalanceSelected, selectedPaymentToken } =
    usePredictPaymentToken();
  const selectedPaymentTokenKey = useMemo(() => {
    if (isPredictBalanceSelected) {
      return 'predict-balance';
    }

    if (!selectedPaymentToken?.address || !selectedPaymentToken?.chainId) {
      return 'external-token:unknown';
    }

    return `${selectedPaymentToken.chainId.toLowerCase()}:${selectedPaymentToken.address.toLowerCase()}`;
  }, [
    isPredictBalanceSelected,
    selectedPaymentToken?.address,
    selectedPaymentToken?.chainId,
  ]);
  const previousSelectedPaymentTokenKeyRef = useRef(selectedPaymentTokenKey);

  const errorResult = useMemo<PredictBuyErrorResult | undefined>(() => {
    if (
      !isPlacingOrder &&
      !isConfirming &&
      !isPredictBalanceSelected &&
      !!blockingPayAlertMessage
    ) {
      return {
        status: 'error',
        error: blockingPayAlertMessage,
        source: 'blocking_pay_alert',
      };
    }

    if (
      isBalanceLoading ||
      isPlacingOrder ||
      isConfirming ||
      !preview ||
      isPayFeesLoading
    ) {
      return undefined;
    }

    if (!activeOrder?.error) {
      return undefined;
    }

    const orderError = getPlaceOrderErrorOutcome({
      error: activeOrder?.error,
      orderParams: { preview },
    });

    if (
      orderError.status !== 'error' &&
      orderError.status !== 'order_not_filled'
    ) {
      return undefined;
    }

    return {
      ...orderError,
      source: 'order_error',
    };
  }, [
    isBalanceLoading,
    isPlacingOrder,
    isConfirming,
    preview,
    isPayFeesLoading,
    isPredictBalanceSelected,
    blockingPayAlertMessage,
    activeOrder?.error,
  ]);

  const errorMessageData = useMemo<
    PredictBuyErrorMessageData | undefined
  >(() => {
    if (previewError) {
      return {
        message: previewError,
        source: 'preview',
      };
    }

    if (isBelowMinimum) {
      return {
        message: strings('predict.order.prediction_minimum_bet', {
          amount: formatPrice(MINIMUM_BET, {
            minimumDecimals: 2,
            maximumDecimals: 2,
          }),
        }),
        source: 'below_minimum',
      };
    }

    if (isInsufficientBalance) {
      const formattedMax = formatPrice(maxBetAmount, {
        minimumDecimals: 2,
        maximumDecimals: 2,
      });

      return {
        message:
          maxBetAmount >= MINIMUM_BET
            ? strings('predict.order.prediction_insufficient_funds_try_token', {
                amount: formattedMax,
              })
            : strings('predict.order.no_funds_enough_try_token'),
        source: 'insufficient_balance',
      };
    }

    if (!errorResult) {
      return undefined;
    }

    if (errorResult.status === 'order_not_filled') {
      return undefined;
    }

    if (errorResult.status === 'error') {
      // In sheet mode, active-order errors are surfaced via `buyErrorBanner`
      // instead of inline text -- UNLESS the banner is itself suppressed by a
      // blocking pay-alert for an external token. In that case, fall through
      // so errorMessage can surface the error. In legacy (full-screen) mode
      // there is no banner, so we always return the error string.
      const bannerWouldSuppress =
        isSheetMode &&
        activeOrder?.error &&
        !(blockingPayAlertMessage && !isPredictBalanceSelected);
      if (bannerWouldSuppress) {
        return undefined;
      }

      return {
        message: errorResult.error,
        source: errorResult.source,
      };
    }

    return undefined;
  }, [
    previewError,
    errorResult,
    isBelowMinimum,
    isInsufficientBalance,
    maxBetAmount,
    activeOrder?.error,
    blockingPayAlertMessage,
    isPredictBalanceSelected,
    isSheetMode,
  ]);

  const currentBuyErrorBanner =
    useMemo<PredictBuyErrorBannerData | null>(() => {
      // Inline banners are a sheet-mode-only surface. In legacy full-screen
      // mode the equivalent error is surfaced via `errorMessage` instead.
      if (!isSheetMode) {
        return null;
      }

      if (isPlacingOrder || isConfirming) {
        return null;
      }

      if (!activeOrder?.error) {
        return null;
      }

      if (blockingPayAlertMessage && !isPredictBalanceSelected) {
        return null;
      }

      const orderError = getPlaceOrderErrorOutcome({
        error: activeOrder.error,
        orderParams: { preview } as PlaceOrderParams,
      });

      if (!orderError) {
        return null;
      }

      if (orderError.status === 'order_not_filled') {
        const fallbackPrice = preview?.sharePrice ?? outcomeTokenPrice ?? 0;
        return {
          variant: 'price_changed',
          title: strings('predict.order.price_changed_title'),
          description: strings('predict.order.price_changed_body', {
            price: formatCents(fallbackPrice),
          }),
        };
      }

      if (orderError.status === 'error') {
        return {
          variant: 'order_failed',
          title: strings('predict.order.order_failed_title'),
          description: strings('predict.order.order_failed_body'),
        };
      }

      return null;
    }, [
      activeOrder?.error,
      preview,
      outcomeTokenPrice,
      isPlacingOrder,
      isConfirming,
      blockingPayAlertMessage,
      isPredictBalanceSelected,
      isSheetMode,
    ]);

  useEffect(() => {
    if (currentBuyErrorBanner) {
      setPersistedBuyErrorBanner(currentBuyErrorBanner);
    }
  }, [currentBuyErrorBanner]);

  useEffect(() => {
    if (
      previousSelectedPaymentTokenKeyRef.current === selectedPaymentTokenKey
    ) {
      return;
    }

    previousSelectedPaymentTokenKeyRef.current = selectedPaymentTokenKey;
    setPersistedBuyErrorBanner(null);
  }, [selectedPaymentTokenKey]);

  const shouldSuppressBuyErrorBanner =
    !isSheetMode ||
    isPlacingOrder ||
    isConfirming ||
    Boolean(blockingPayAlertMessage && !isPredictBalanceSelected);

  const buyErrorBanner =
    currentBuyErrorBanner ??
    (shouldSuppressBuyErrorBanner ? null : persistedBuyErrorBanner);

  const clearBuyErrorBanner = useCallback(() => {
    clearOrderError();
    setIsOrderNotFilled(false);
    setPersistedBuyErrorBanner(null);
  }, [clearOrderError]);

  const resetOrderNotFilled = clearBuyErrorBanner;

  useEffect(() => {
    if (errorResult?.status === 'order_not_filled') {
      setIsOrderNotFilled(true);
    }
  }, [errorResult]);

  return {
    errorMessage: errorMessageData?.message,
    errorMessageSource: errorMessageData?.source,
    buyErrorBanner,
    isOrderNotFilled,
    resetOrderNotFilled,
    clearBuyErrorBanner,
  };
};
