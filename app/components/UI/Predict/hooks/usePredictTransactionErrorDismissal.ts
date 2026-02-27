import { useCallback, useEffect, useRef } from 'react';
import Engine from '../../../../core/Engine';
import { usePredictActiveOrder } from './usePredictActiveOrder';
import { usePredictPaymentToken } from './usePredictPaymentToken';

interface UsePredictTransactionErrorDismissalParams {
  amount: number;
}

export function usePredictTransactionErrorDismissal({
  amount,
}: UsePredictTransactionErrorDismissalParams) {
  const activeOrder = usePredictActiveOrder();
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

  const previousPaymentTokenKeyRef = useRef<string | null>(null);
  useEffect(() => {
    const currentPaymentTokenKey = isPredictBalanceSelected
      ? 'predict-balance'
      : (selectedPaymentToken?.address?.toLowerCase() ?? null);

    if (previousPaymentTokenKeyRef.current === null) {
      previousPaymentTokenKeyRef.current = currentPaymentTokenKey;
      return;
    }

    if (previousPaymentTokenKeyRef.current === currentPaymentTokenKey) {
      return;
    }

    previousPaymentTokenKeyRef.current = currentPaymentTokenKey;
    clearTransactionError();
  }, [
    clearTransactionError,
    isPredictBalanceSelected,
    selectedPaymentToken?.address,
  ]);

  const previousAmountRef = useRef<number | null>(null);
  useEffect(() => {
    if (previousAmountRef.current === null) {
      previousAmountRef.current = amount;
      return;
    }

    if (previousAmountRef.current === amount) {
      return;
    }

    previousAmountRef.current = amount;
    clearTransactionError();
  }, [amount, clearTransactionError]);
}
