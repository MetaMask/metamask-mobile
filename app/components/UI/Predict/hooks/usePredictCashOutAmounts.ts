import { useCallback, useEffect, useState } from 'react';
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

  const calculateCashOutAmounts = useCallback(async () => {
    setIsCalculating(true);
    try {
      if (!selectedInternalAccountAddress) {
        throw new Error('No selected internal account address');
      }
      const expectedAmountResponse = await controllerCalculateCashOutAmounts({
        address: selectedInternalAccountAddress,
        providerId,
        outcomeTokenId,
        marketId,
      });
      setCashOutAmounts(expectedAmountResponse);
    } catch (err) {
      console.error('Failed to calculate cash out amount:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsCalculating(false);
    }
  }, [
    selectedInternalAccountAddress,
    controllerCalculateCashOutAmounts,
    providerId,
    outcomeTokenId,
    marketId,
  ]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      calculateCashOutAmounts();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [calculateCashOutAmounts]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefreshTimeout) {
      return;
    }

    const refreshTimer = setInterval(() => {
      calculateCashOutAmounts();
    }, autoRefreshTimeout);

    return () => {
      clearInterval(refreshTimer);
    };
  }, [calculateCashOutAmounts, autoRefreshTimeout]);

  return {
    cashOutAmounts,
    isCalculating,
    error,
  };
};
