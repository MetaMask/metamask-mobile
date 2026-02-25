import { useEffect, useRef } from 'react';
import { PlaceOrderParams } from '../providers/types';
import { usePredictDepositAndOrder } from './usePredictDepositAndOrder';
import { usePredictPaymentToken } from './usePredictPaymentToken';
import { PredictBuyPreviewParams } from '../types/navigation';

interface UsePredictTokenSelectionParams {
  analyticsProperties?: PlaceOrderParams['analyticsProperties'];
  market: PredictBuyPreviewParams['market'];
  outcome: PredictBuyPreviewParams['outcome'];
  outcomeToken: PredictBuyPreviewParams['outcomeToken'];
}

export function usePredictTokenSelection({
  analyticsProperties,
  market,
  outcome,
  outcomeToken,
}: UsePredictTokenSelectionParams) {
  const { depositAndOrder } = usePredictDepositAndOrder();
  const { isPredictBalanceSelected, selectedPaymentToken } =
    usePredictPaymentToken();

  const hasInitializedTokenSelectionRef = useRef(false);
  const previousSelectedTokenAddressRef = useRef<string | null>(null);
  const shouldPreserveActiveOrderOnUnmountRef = useRef(false);

  useEffect(() => {
    const selectedTokenAddress = selectedPaymentToken?.address ?? null;

    if (!hasInitializedTokenSelectionRef.current) {
      hasInitializedTokenSelectionRef.current = true;
      previousSelectedTokenAddressRef.current = selectedTokenAddress;
      return;
    }

    if (isPredictBalanceSelected || !selectedTokenAddress) {
      previousSelectedTokenAddressRef.current = selectedTokenAddress;
      return;
    }

    if (previousSelectedTokenAddressRef.current === selectedTokenAddress) {
      return;
    }

    previousSelectedTokenAddressRef.current = selectedTokenAddress;
    shouldPreserveActiveOrderOnUnmountRef.current = true;

    depositAndOrder({
      market,
      outcome,
      outcomeToken,
      analyticsProperties,
    }).catch(() => undefined);
  }, [
    analyticsProperties,
    depositAndOrder,
    isPredictBalanceSelected,
    market,
    outcome,
    outcomeToken,
    selectedPaymentToken?.address,
  ]);

  return { shouldPreserveActiveOrderOnUnmountRef };
}
