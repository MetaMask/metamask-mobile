import { useEffect, useRef } from 'react';
import { PlaceOrderParams } from '../providers/types';
import { usePredictDepositAndOrder } from './usePredictDepositAndOrder';
import { usePredictPaymentToken } from './usePredictPaymentToken';
import { PredictBuyPreviewParams } from '../types/navigation';

interface UsePredictTokenSelectionParams {
  analyticsProperties?: PlaceOrderParams['analyticsProperties'];
  amountUsd: number;
  onTokenSelected?: () => void;
  market: PredictBuyPreviewParams['market'];
  outcome: PredictBuyPreviewParams['outcome'];
  outcomeToken: PredictBuyPreviewParams['outcomeToken'];
}

export function usePredictTokenSelection({
  analyticsProperties,
  amountUsd,
  onTokenSelected,
  market,
  outcome,
  outcomeToken,
}: UsePredictTokenSelectionParams) {
  const { depositAndOrder } = usePredictDepositAndOrder();
  const { isPredictBalanceSelected, selectedPaymentToken } =
    usePredictPaymentToken();

  const hasInitializedTokenSelectionRef = useRef(false);
  const previousSelectedTokenKeyRef = useRef<string | null>(null);
  const shouldPreserveActiveOrderOnUnmountRef = useRef(false);

  useEffect(() => {
    const selectedTokenAddress = selectedPaymentToken?.address ?? null;
    const selectedTokenKey = isPredictBalanceSelected
      ? 'predict-balance'
      : selectedTokenAddress;

    if (!hasInitializedTokenSelectionRef.current) {
      hasInitializedTokenSelectionRef.current = true;
      previousSelectedTokenKeyRef.current = selectedTokenKey;
      return;
    }

    if (previousSelectedTokenKeyRef.current === selectedTokenKey) {
      return;
    }

    previousSelectedTokenKeyRef.current = selectedTokenKey;
    onTokenSelected?.();

    if (isPredictBalanceSelected || !selectedTokenAddress) {
      return;
    }

    shouldPreserveActiveOrderOnUnmountRef.current = true;

    depositAndOrder({
      market,
      outcome,
      outcomeToken,
      ...(amountUsd > 0 ? { amountUsd } : {}),
      analyticsProperties,
    }).catch(() => undefined);
  }, [
    amountUsd,
    analyticsProperties,
    depositAndOrder,
    isPredictBalanceSelected,
    market,
    onTokenSelected,
    outcome,
    outcomeToken,
    selectedPaymentToken?.address,
  ]);

  return { shouldPreserveActiveOrderOnUnmountRef };
}
