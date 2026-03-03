import { useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectPredictActiveOrder } from '../selectors/predictController';
import { usePredictPaymentToken } from './usePredictPaymentToken';
import { usePreviousValue } from './usePreviousValue';

interface UsePredictTransactionErrorDismissalParams {
  amount: number;
}

export function usePredictTransactionErrorDismissal({
  amount,
}: UsePredictTransactionErrorDismissalParams) {
  const activeOrder = useSelector(selectPredictActiveOrder);
  const { isPredictBalanceSelected, selectedPaymentToken } =
    usePredictPaymentToken();

  const clearTransactionError = useCallback(() => {
    if (!activeOrder?.transactionError) {
      return;
    }

    const { transactionError: _ignored, ...activeOrderWithoutError } =
      activeOrder;
    Engine.context.PredictController.setActiveOrder(activeOrderWithoutError);
  }, [activeOrder]);

  const paymentTokenKey = isPredictBalanceSelected
    ? 'predict-balance'
    : (selectedPaymentToken?.address?.toLowerCase() ?? null);
  const previousPaymentTokenKey = usePreviousValue(paymentTokenKey);

  useEffect(() => {
    if (
      previousPaymentTokenKey !== undefined &&
      previousPaymentTokenKey !== paymentTokenKey
    ) {
      clearTransactionError();
    }
  }, [clearTransactionError, paymentTokenKey, previousPaymentTokenKey]);

  const previousAmount = usePreviousValue(amount);

  useEffect(() => {
    if (previousAmount !== undefined && previousAmount !== amount) {
      clearTransactionError();
    }
  }, [amount, clearTransactionError, previousAmount]);
}
