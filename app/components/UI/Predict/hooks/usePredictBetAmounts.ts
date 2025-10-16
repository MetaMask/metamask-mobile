import { useCallback, useEffect, useRef, useState } from 'react';
import { CalculateBetAmountsResponse } from '../providers/types';
import { usePredictTrading } from './usePredictTrading';
import { PredictOutcomeToken } from '../types';

interface UsePredictBetAmountsParams {
  providerId: string;
  outcomeToken: PredictOutcomeToken;
  userBetAmount: number;
  autoRefreshTimeout?: number;
}

export const usePredictBetAmounts = ({
  providerId,
  outcomeToken,
  userBetAmount,
  autoRefreshTimeout,
}: UsePredictBetAmountsParams) => {
  const [betAmounts, setBetAmounts] = useState<CalculateBetAmountsResponse>({
    toWin: 0,
    sharePrice: outcomeToken?.price ?? 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const { calculateBetAmounts: controllerCalculateBetAmounts } =
    usePredictTrading();

  // Track the current operation to prevent race conditions
  const currentOperationRef = useRef<number>(0);

  const calculateBetAmounts = useCallback(async () => {
    const operationId = ++currentOperationRef.current;
    if (!outcomeToken || userBetAmount <= 0) {
      // Only update state if this is still the current operation
      if (operationId === currentOperationRef.current) {
        setBetAmounts({ toWin: 0, sharePrice: outcomeToken?.price || 0 });
        setIsCalculating(false);
      }
      return;
    }

    setIsCalculating(true);
    try {
      const expectedAmountResponse = await controllerCalculateBetAmounts({
        providerId,
        outcomeTokenId: outcomeToken.id,
        userBetAmount,
      });
      // Only update state if this is still the current operation
      if (operationId === currentOperationRef.current) {
        setBetAmounts(expectedAmountResponse);
      }
    } catch (err) {
      console.error('Failed to calculate to win amount:', err);
      // Only update error state if this is still the current operation
      if (operationId === currentOperationRef.current) {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      // Only update loading state if this is still the current operation
      if (operationId === currentOperationRef.current) {
        setIsCalculating(false);
      }
    }
  }, [outcomeToken, userBetAmount, controllerCalculateBetAmounts, providerId]);

  const calculateBetAmountsRef = useRef(calculateBetAmounts);
  calculateBetAmountsRef.current = calculateBetAmounts;

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      calculateBetAmountsRef.current();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [outcomeToken, userBetAmount, providerId]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefreshTimeout) {
      return;
    }

    const refreshTimer = setInterval(() => {
      calculateBetAmountsRef.current();
    }, autoRefreshTimeout);

    return () => {
      clearInterval(refreshTimer);
    };
  }, [outcomeToken, userBetAmount, providerId, autoRefreshTimeout]);

  return {
    betAmounts,
    isCalculating,
    error,
  };
};
