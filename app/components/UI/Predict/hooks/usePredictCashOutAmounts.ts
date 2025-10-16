import { useCallback, useEffect, useRef, useState } from 'react';
import { CalculateCashOutAmountsResponse } from '../providers/types';
import { usePredictTrading } from './usePredictTrading';
import { PredictPosition } from '../types';
import { selectSelectedInternalAccountAddress } from '../../../../selectors/accountsController';
import { useSelector } from 'react-redux';

interface UsePredictCashOutAmountsParams {
  position: PredictPosition;
  autoRefreshTimeout?: number;
}

export const usePredictCashOutAmounts = ({
  position,
  autoRefreshTimeout,
}: UsePredictCashOutAmountsParams) => {
  const {
    providerId,
    marketId,
    outcomeTokenId,
    cashPnl,
    percentPnl,
    currentValue,
  } = position;
  const [cashOutAmounts, setCashOutAmounts] =
    useState<CalculateCashOutAmountsResponse>({
      cashPnl,
      percentPnl,
      currentValue,
    });
  const [error, setError] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const { calculateCashOutAmounts: controllerCalculateCashOutAmounts } =
    usePredictTrading();

  const selectedInternalAccountAddress = useSelector(
    selectSelectedInternalAccountAddress,
  );

  // Track the current operation to prevent race conditions
  const currentOperationRef = useRef<number>(0);
  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef<boolean>(true);

  const calculateCashOutAmounts = useCallback(async () => {
    const operationId = ++currentOperationRef.current;
    if (!isMountedRef.current) {
      return;
    }
    setIsCalculating(true);
    try {
      if (!selectedInternalAccountAddress) {
        // Only update error state if this is still the current operation and component is mounted
        if (
          operationId === currentOperationRef.current &&
          isMountedRef.current
        ) {
          setError('No selected internal account address');
          setIsCalculating(false);
        }
        return;
      }
      const expectedAmountResponse = await controllerCalculateCashOutAmounts({
        address: selectedInternalAccountAddress,
        providerId,
        outcomeTokenId,
        marketId,
      });
      // Only update state if this is still the current operation and component is mounted
      if (operationId === currentOperationRef.current && isMountedRef.current) {
        setCashOutAmounts(expectedAmountResponse);
        setError(null); // Clear any previous errors on success
      }
    } catch (err) {
      console.error('Failed to calculate cash out amount:', err);
      // Only update error state if this is still the current operation and component is mounted
      if (operationId === currentOperationRef.current && isMountedRef.current) {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      // Only update loading state if this is still the current operation and component is mounted
      if (operationId === currentOperationRef.current && isMountedRef.current) {
        setIsCalculating(false);
      }
    }
  }, [
    selectedInternalAccountAddress,
    controllerCalculateCashOutAmounts,
    providerId,
    outcomeTokenId,
    marketId,
  ]);

  const calculateCashOutAmountsRef = useRef(calculateCashOutAmounts);
  calculateCashOutAmountsRef.current = calculateCashOutAmounts;

  // Cleanup on unmount
  useEffect(
    () => () => {
      isMountedRef.current = false;
    },
    [],
  );

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      calculateCashOutAmountsRef.current();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [selectedInternalAccountAddress, providerId, outcomeTokenId, marketId]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefreshTimeout) {
      return;
    }

    const refreshTimer = setInterval(() => {
      calculateCashOutAmountsRef.current();
    }, autoRefreshTimeout);

    return () => {
      clearInterval(refreshTimer);
    };
  }, [
    selectedInternalAccountAddress,
    providerId,
    outcomeTokenId,
    marketId,
    autoRefreshTimeout,
  ]);

  return {
    cashOutAmounts,
    isCalculating,
    error,
  };
};
