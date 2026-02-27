import { useEffect, useMemo, useRef, useState } from 'react';
import { OrderPreview, PlaceOrderParams } from '../providers/types';
import { usePredictOrderDepositTracking } from './usePredictOrderDepositTracking';

interface UsePredictAutoPlaceOrderParams {
  amount?: number;
  transactionId?: string;
  isPredictBalanceSelected: boolean;
  canPlaceBet: boolean;
  preview?: OrderPreview | null;
  analyticsProperties: PlaceOrderParams['analyticsProperties'];
  placeOrder: (params: PlaceOrderParams) => Promise<unknown>;
  setCurrentValue: (value: number) => void;
  setCurrentValueUSDString: (value: string) => void;
  setIsInputFocused: (value: boolean) => void;
  onDepositFailed?: (errorMessage?: string) => Promise<void> | void;
}

interface UsePredictAutoPlaceOrderResult {
  isAutoPlaceLoading: boolean;
}

export function usePredictAutoPlaceOrder({
  amount,
  transactionId,
  isPredictBalanceSelected,
  canPlaceBet,
  preview,
  analyticsProperties,
  placeOrder,
  setCurrentValue,
  setCurrentValueUSDString,
  setIsInputFocused,
  onDepositFailed,
}: UsePredictAutoPlaceOrderParams): UsePredictAutoPlaceOrderResult {
  const shouldAutoPlaceOrder = useMemo(
    () => typeof amount === 'number' && amount > 0,
    [amount],
  );
  const [isAutoPlaceLoading, setIsAutoPlaceLoading] = useState(
    () => shouldAutoPlaceOrder,
  );
  const hasInitializedAutoPlaceOrderRef = useRef(false);
  const hasTriggeredAutoPlaceOrderRef = useRef(false);
  const hasHandledFailedDepositRef = useRef(false);

  const {
    isConfirmed: isAutoPlaceDepositConfirmed,
    hasFailed: hasAutoPlaceDepositFailed,
    errorMessage: autoPlaceDepositErrorMessage,
  } = usePredictOrderDepositTracking({
    transactionId: shouldAutoPlaceOrder ? transactionId : undefined,
  });

  useEffect(() => {
    if (
      typeof amount !== 'number' ||
      amount <= 0 ||
      hasInitializedAutoPlaceOrderRef.current
    ) {
      return;
    }

    hasInitializedAutoPlaceOrderRef.current = true;
    setCurrentValue(amount);
    setCurrentValueUSDString(amount.toString());
    setIsInputFocused(false);
  }, [amount, setCurrentValue, setCurrentValueUSDString, setIsInputFocused]);

  useEffect(() => {
    if (!shouldAutoPlaceOrder) {
      setIsAutoPlaceLoading(false);
      return;
    }

    if (!transactionId || hasAutoPlaceDepositFailed) {
      setIsAutoPlaceLoading(false);
    }
  }, [transactionId, hasAutoPlaceDepositFailed, shouldAutoPlaceOrder]);

  useEffect(() => {
    if (
      !shouldAutoPlaceOrder ||
      !hasAutoPlaceDepositFailed ||
      hasHandledFailedDepositRef.current
    ) {
      return;
    }

    hasHandledFailedDepositRef.current = true;
    setIsAutoPlaceLoading(false);
    const retryResult = onDepositFailed?.(autoPlaceDepositErrorMessage);
    if (retryResult) {
      Promise.resolve(retryResult).catch(() => undefined);
    }
  }, [
    autoPlaceDepositErrorMessage,
    hasAutoPlaceDepositFailed,
    onDepositFailed,
    shouldAutoPlaceOrder,
  ]);

  useEffect(() => {
    if (!shouldAutoPlaceOrder || hasTriggeredAutoPlaceOrderRef.current) {
      return;
    }

    if (
      !isAutoPlaceDepositConfirmed ||
      !isPredictBalanceSelected ||
      !canPlaceBet ||
      !preview
    ) {
      return;
    }

    hasTriggeredAutoPlaceOrderRef.current = true;
    const executeAutoPlaceOrder = async () => {
      try {
        await placeOrder({
          analyticsProperties,
          preview,
        });
      } finally {
        setIsAutoPlaceLoading(false);
      }
    };

    executeAutoPlaceOrder().catch(() => undefined);
  }, [
    analyticsProperties,
    canPlaceBet,
    isAutoPlaceDepositConfirmed,
    isPredictBalanceSelected,
    placeOrder,
    preview,
    shouldAutoPlaceOrder,
  ]);

  return { isAutoPlaceLoading };
}
