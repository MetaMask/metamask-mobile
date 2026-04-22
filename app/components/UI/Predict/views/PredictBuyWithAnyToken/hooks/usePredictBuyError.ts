import { useCallback, useEffect, useMemo, useState } from 'react';
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
}: UsePredictBuyInfoParams) => {
  const { activeOrder, clearOrderError } = usePredictActiveOrder();
  const { isBalanceLoading } = usePredictBuyAvailableBalance();
  const [isOrderNotFilled, setIsOrderNotFilled] = useState(false);
  const { isPredictBalanceSelected } = usePredictPaymentToken();

  const errorResult = useMemo(() => {
    if (isBalanceLoading || isPlacingOrder || isConfirming || !preview) {
      return undefined;
    }

    const ready = !isPayFeesLoading && !isPredictBalanceSelected;

    if (ready && !!blockingPayAlertMessage) {
      return {
        status: 'error',
        error: blockingPayAlertMessage,
      };
    }

    return activeOrder?.error
      ? getPlaceOrderErrorOutcome({
          error: activeOrder?.error,
          orderParams: { preview },
        })
      : undefined;
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

  const errorMessage = useMemo(() => {
    if (previewError) {
      return previewError;
    }

    if (isBelowMinimum) {
      return strings('predict.order.prediction_minimum_bet', {
        amount: formatPrice(MINIMUM_BET, {
          minimumDecimals: 2,
          maximumDecimals: 2,
        }),
      });
    }

    if (isInsufficientBalance) {
      const formattedMax = formatPrice(maxBetAmount, {
        minimumDecimals: 2,
        maximumDecimals: 2,
      });
      return maxBetAmount >= MINIMUM_BET
        ? strings('predict.order.prediction_insufficient_funds_try_token', {
            amount: formattedMax,
          })
        : strings('predict.order.no_funds_enough_try_token');
    }

    if (!errorResult) {
      return undefined;
    }

    if (errorResult.status === 'order_not_filled') {
      return undefined;
    }

    if (errorResult.status === 'error') {
      // Active-order errors (with no pay-alert priority) are surfaced via
      // buyErrorBanner instead of inline text in sheet flows.
      if (activeOrder?.error && !blockingPayAlertMessage) {
        return undefined;
      }
      return errorResult.error;
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
  ]);

  const buyErrorBanner = useMemo<PredictBuyErrorBannerData | null>(() => {
    if (isPlacingOrder || isConfirming) {
      return null;
    }

    if (!activeOrder?.error) {
      return null;
    }

    if (blockingPayAlertMessage) {
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
  ]);

  const resetOrderNotFilled = useCallback(() => {
    clearOrderError();
    setIsOrderNotFilled(false);
  }, [clearOrderError]);

  const clearBuyErrorBanner = useCallback(() => {
    clearOrderError();
    setIsOrderNotFilled(false);
  }, [clearOrderError]);

  useEffect(() => {
    if (errorResult?.status === 'order_not_filled') {
      setIsOrderNotFilled(true);
    }
  }, [errorResult]);

  return {
    errorMessage,
    buyErrorBanner,
    isOrderNotFilled,
    resetOrderNotFilled,
    clearBuyErrorBanner,
  };
};
