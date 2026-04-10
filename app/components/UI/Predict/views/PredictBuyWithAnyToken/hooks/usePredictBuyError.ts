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
import { useNoPayTokenQuotesAlert } from '../../../../../Views/confirmations/hooks/alerts/useNoPayTokenQuotesAlert';

interface UsePredictBuyInfoParams {
  preview?: OrderPreview | null;
  previewError: string | null;
  isConfirming: boolean;
  isPlacingOrder: boolean;
  isBelowMinimum: boolean;
  isInsufficientBalance: boolean;
  maxBetAmount: number;
  isPayFeesLoading: boolean;
  isInputFocused: boolean;
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
  isInputFocused,
}: UsePredictBuyInfoParams) => {
  const { activeOrder, clearOrderError } = usePredictActiveOrder();
  const { isBalanceLoading } = usePredictBuyAvailableBalance();
  const [isOrderNotFilled, setIsOrderNotFilled] = useState(false);
  const { isPredictBalanceSelected } = usePredictPaymentToken();

  const insufficientPayAlerts = useInsufficientPayTokenBalanceAlert();
  const noQuotesAlerts = useNoPayTokenQuotesAlert();

  const blockingPayAlerts = useMemo(() => {
    const allPayAlerts = [...insufficientPayAlerts, ...noQuotesAlerts];
    return allPayAlerts.filter((a) => a.isBlocking);
  }, [insufficientPayAlerts, noQuotesAlerts]);

  const blockingPayAlertMessage = useMemo(
    () => blockingPayAlerts[0]?.message ?? blockingPayAlerts[0]?.title,
    [blockingPayAlerts],
  );

  const errorResult = useMemo(() => {
    if (isBalanceLoading || isPlacingOrder || isConfirming || !preview) {
      return undefined;
    }

    const ready =
      !isPayFeesLoading && !isPredictBalanceSelected && !isInputFocused;

    // Suppress the alert while the user is actively editing the amount.
    // The deposit amount only syncs to TransactionPayController when the
    // input loses focus, so the alert may reflect an outdated amount.
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
    isInputFocused,
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
