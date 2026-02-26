import { useEffect, useRef, useState } from 'react';
import { PlaceOrderParams } from '../providers/types';
import { usePredictDepositAndOrder } from './usePredictDepositAndOrder';
import { usePredictPaymentToken } from './usePredictPaymentToken';
import { PredictBuyPreviewParams } from '../types/navigation';

interface UsePredictTokenSelectionParams {
  analyticsProperties?: PlaceOrderParams['analyticsProperties'];
  amountUsd: number;
  isInputFocused: boolean;
  onTokenSelected?: () => boolean | void;
  market: PredictBuyPreviewParams['market'];
  outcome: PredictBuyPreviewParams['outcome'];
  outcomeToken: PredictBuyPreviewParams['outcomeToken'];
}

export function usePredictTokenSelection({
  analyticsProperties,
  amountUsd,
  isInputFocused,
  onTokenSelected,
  market,
  outcome,
  outcomeToken,
}: UsePredictTokenSelectionParams) {
  const { depositAndOrder } = usePredictDepositAndOrder();
  const { isPredictBalanceSelected, selectedPaymentToken } =
    usePredictPaymentToken();
  const [isDepositAndOrderLoading, setIsDepositAndOrderLoading] =
    useState(false);

  const hasInitializedTokenSelectionRef = useRef(false);
  const previousSelectedTokenKeyRef = useRef<string | null>(null);
  const shouldPreserveActiveOrderOnUnmountRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(
    () => () => {
      isMountedRef.current = false;
    },
    [],
  );

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
    const nextIsInputFocused = onTokenSelected?.();

    if (isPredictBalanceSelected || !selectedTokenAddress) {
      return;
    }

    shouldPreserveActiveOrderOnUnmountRef.current = true;
    setIsDepositAndOrderLoading(true);

    depositAndOrder({
      market,
      outcome,
      outcomeToken,
      isInputFocused:
        typeof nextIsInputFocused === 'boolean'
          ? nextIsInputFocused
          : isInputFocused,
      ...(amountUsd > 0 ? { amountUsd } : {}),
      analyticsProperties,
    })
      .catch(() => undefined)
      .finally(() => {
        if (isMountedRef.current) {
          setIsDepositAndOrderLoading(false);
        }
      });
  }, [
    amountUsd,
    analyticsProperties,
    depositAndOrder,
    isInputFocused,
    isPredictBalanceSelected,
    market,
    onTokenSelected,
    outcome,
    outcomeToken,
    selectedPaymentToken?.address,
  ]);

  return {
    shouldPreserveActiveOrderOnUnmountRef,
    isDepositAndOrderLoading,
  };
}
