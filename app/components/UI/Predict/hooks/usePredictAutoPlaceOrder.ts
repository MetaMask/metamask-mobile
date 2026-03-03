import { useEffect, useState } from 'react';
import { OrderPreview, PlaceOrderParams } from '../providers/types';
import { usePredictPayWithAnyTokenTracking } from './usePredictPayWithAnyTokenTracking';

type AutoPlacePhase = 'idle' | 'initialized' | 'order_placed' | 'failed';

interface UsePredictAutoPlaceOrderParams {
  amount?: number;
  transactionId?: string;
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
  canPlaceBet,
  preview,
  analyticsProperties,
  placeOrder,
  setCurrentValue,
  setCurrentValueUSDString,
  setIsInputFocused,
  onDepositFailed,
}: UsePredictAutoPlaceOrderParams): UsePredictAutoPlaceOrderResult {
  const shouldAutoPlaceOrder = typeof amount === 'number' && amount > 0;

  const [isAutoPlaceLoading, setIsAutoPlaceLoading] = useState(
    () => shouldAutoPlaceOrder,
  );
  const [phase, setPhase] = useState<AutoPlacePhase>(
    shouldAutoPlaceOrder ? 'idle' : 'initialized',
  );

  const {
    isConfirmed: isAutoPlaceDepositConfirmed,
    hasFailed: hasAutoPlaceDepositFailed,
    errorMessage: autoPlaceDepositErrorMessage,
  } = usePredictPayWithAnyTokenTracking({
    transactionId: shouldAutoPlaceOrder ? transactionId : undefined,
  });

  useEffect(() => {
    if (phase !== 'idle' || typeof amount !== 'number' || amount <= 0) {
      return;
    }

    setPhase('initialized');
    setCurrentValue(amount);
    setCurrentValueUSDString(amount.toString());
    setIsInputFocused(false);
  }, [
    phase,
    amount,
    setCurrentValue,
    setCurrentValueUSDString,
    setIsInputFocused,
  ]);

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
      phase === 'failed'
    ) {
      return;
    }

    setPhase('failed');
    setIsAutoPlaceLoading(false);
    const retryResult = onDepositFailed?.(autoPlaceDepositErrorMessage);
    if (retryResult) {
      Promise.resolve(retryResult).catch(() => undefined);
    }
  }, [
    autoPlaceDepositErrorMessage,
    hasAutoPlaceDepositFailed,
    onDepositFailed,
    phase,
    shouldAutoPlaceOrder,
  ]);

  useEffect(() => {
    if (!shouldAutoPlaceOrder || phase === 'order_placed') {
      return;
    }

    if (!isAutoPlaceDepositConfirmed || !canPlaceBet || !preview) {
      return;
    }

    setPhase('order_placed');
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
    phase,
    placeOrder,
    preview,
    shouldAutoPlaceOrder,
  ]);

  return { isAutoPlaceLoading };
}
