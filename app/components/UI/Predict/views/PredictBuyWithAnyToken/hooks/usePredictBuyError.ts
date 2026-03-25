import { useCallback, useEffect, useMemo, useState } from 'react';
import { strings } from '../../../../../../../locales/i18n';
import { MINIMUM_BET } from '../../../constants/transactions';
import { usePredictActiveOrder } from '../../../hooks/usePredictActiveOrder';
import { OrderPreview } from '../../../types';
import { formatPrice } from '../../../utils/format';
import { checkPlaceOrderError } from '../../../utils/predictErrorHandler';
import { usePredictBuyAvailableBalance } from './usePredictBuyAvailableBalance';

interface UsePredictBuyInfoParams {
  preview?: OrderPreview | null;
  previewError: string | null;
  isConfirming: boolean;
  isPlacingOrder: boolean;
  isBelowMinimum: boolean;
  isInsufficientBalance: boolean;
  maxBetAmount: number;
}

export const usePredictBuyError = ({
  preview,
  previewError,
  isConfirming,
  isPlacingOrder,
  isBelowMinimum,
  isInsufficientBalance,
  maxBetAmount,
}: UsePredictBuyInfoParams) => {
  const { activeOrder, clearOrderError } = usePredictActiveOrder();
  const { isBalanceLoading } = usePredictBuyAvailableBalance();
  const [isOrderNotFilled, setIsOrderNotFilled] = useState(false);

  const errorResult = useMemo(() => {
    if (isBalanceLoading || isPlacingOrder || isConfirming || !preview) {
      return undefined;
    }

    return activeOrder?.error
      ? checkPlaceOrderError({
          error: activeOrder?.error,
          orderParams: { preview },
        })
      : undefined;
  }, [
    isBalanceLoading,
    isPlacingOrder,
    isConfirming,
    preview,
    activeOrder?.error,
  ]);

  const errorMessage = useMemo(() => {
    if (previewError) {
      return previewError;
    }

    if (!errorResult) {
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
          ? strings('predict.order.prediction_insufficient_funds', {
              amount: formattedMax,
            })
          : strings('predict.order.no_funds_enough');
      }
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
    errorResult,
    previewError,
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
