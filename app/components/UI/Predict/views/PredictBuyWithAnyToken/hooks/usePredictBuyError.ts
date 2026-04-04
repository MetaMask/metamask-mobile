import { useCallback, useEffect, useMemo, useState } from 'react';
import { strings } from '../../../../../../../locales/i18n';
import { MINIMUM_BET } from '../../../constants/transactions';
import { usePredictActiveOrder } from '../../../hooks/usePredictActiveOrder';
import { OrderPreview } from '../../../types';
import { formatPrice } from '../../../utils/format';
import { getPlaceOrderErrorOutcome } from '../../../utils/predictErrorHandler';
import { usePredictBuyAvailableBalance } from './usePredictBuyAvailableBalance';
import { usePredictPaymentToken } from '../../../hooks/usePredictPaymentToken';
import { useInsufficientPayTokenBalanceAlert } from '../../../../../Views/confirmations/hooks/alerts/useInsufficientPayTokenBalanceAlert';

interface UsePredictBuyInfoParams {
  preview?: OrderPreview | null;
  previewError: string | null;
  isConfirming: boolean;
  isPlacingOrder: boolean;
  isBelowMinimum: boolean;
  isInsufficientBalance: boolean;
  maxBetAmount: number;
  isPayFeesLoading: boolean;
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
}: UsePredictBuyInfoParams) => {
  const { activeOrder, clearOrderError } = usePredictActiveOrder();
  const { isBalanceLoading } = usePredictBuyAvailableBalance();
  const [isOrderNotFilled, setIsOrderNotFilled] = useState(false);
  const { isPredictBalanceSelected } = usePredictPaymentToken();
  const [insufficientPayTokenBalanceAlert] =
    useInsufficientPayTokenBalanceAlert();

  const errorResult = useMemo(() => {
    if (isBalanceLoading || isPlacingOrder || isConfirming || !preview) {
      return undefined;
    }

    if (
      !isPayFeesLoading &&
      !isPredictBalanceSelected &&
      !!insufficientPayTokenBalanceAlert
    ) {
      return {
        status: 'error',
        error: insufficientPayTokenBalanceAlert.message,
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
    insufficientPayTokenBalanceAlert,
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
      return errorResult.error;
    }

    return undefined;
  }, [
    previewError,
    errorResult,
    isBelowMinimum,
    isInsufficientBalance,
    maxBetAmount,
  ]);

  const resetOrderNotFilled = useCallback(() => {
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
    isOrderNotFilled,
    resetOrderNotFilled,
  };
};
