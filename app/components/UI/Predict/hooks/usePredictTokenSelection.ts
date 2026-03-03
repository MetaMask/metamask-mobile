import { useCallback, useEffect, useRef, useState } from 'react';
import { usePredictPaymentToken } from './usePredictPaymentToken';

interface UsePredictTokenSelectionParams {
  onTokenSelected?: (
    tokenAddress: string | null,
    tokenKey: string | null,
  ) => Promise<void> | void;
}

export function usePredictTokenSelection({
  onTokenSelected,
}: UsePredictTokenSelectionParams) {
  const { isPredictBalanceSelected, selectedPaymentToken } =
    usePredictPaymentToken();
  const [isDepositAndOrderLoading, setIsDepositAndOrderLoading] =
    useState(false);

  const hasInitializedRef = useRef(false);
  const previousSelectedTokenKeyRef = useRef<string | null>(null);
  const shouldPreserveActiveOrderOnUnmountRef = useRef(false);
  const markShouldPreserveActiveOrderOnUnmount = useCallback(() => {
    shouldPreserveActiveOrderOnUnmountRef.current = true;
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const selectedTokenAddress = selectedPaymentToken?.address ?? null;
    const selectedTokenKey = isPredictBalanceSelected
      ? 'predict-balance'
      : selectedTokenAddress;

    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      previousSelectedTokenKeyRef.current = selectedTokenKey;
      return;
    }

    if (previousSelectedTokenKeyRef.current === selectedTokenKey) {
      return;
    }

    previousSelectedTokenKeyRef.current = selectedTokenKey;
    const callbackResult = onTokenSelected?.(
      selectedTokenAddress,
      selectedTokenKey,
    );

    if (!callbackResult) {
      return;
    }

    shouldPreserveActiveOrderOnUnmountRef.current = true;

    const executeTokenSelection = async () => {
      if (!isCancelled) {
        setIsDepositAndOrderLoading(true);
      }

      try {
        await callbackResult;
      } catch {
        // Intentionally ignored; caller handles callback-specific failures.
      }

      if (!isCancelled) {
        setIsDepositAndOrderLoading(false);
      }
    };

    executeTokenSelection();

    return () => {
      isCancelled = true;
    };
  }, [
    isPredictBalanceSelected,
    onTokenSelected,
    selectedPaymentToken?.address,
  ]);

  return {
    shouldPreserveActiveOrderOnUnmountRef,
    markShouldPreserveActiveOrderOnUnmount,
    isDepositAndOrderLoading,
  };
}
