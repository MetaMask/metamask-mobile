import { useCallback, useEffect, useState } from 'react';
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
    sharePrice: outcomeToken.price,
  });
  const [error, setError] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const { calculateBetAmounts: controllerCalculateBetAmounts } =
    usePredictTrading();

  const calculateBetAmounts = useCallback(async () => {
    if (!outcomeToken || userBetAmount <= 0) {
      setBetAmounts({ toWin: 0, sharePrice: 0 });
      setIsCalculating(false);
      return;
    }

    setIsCalculating(true);
    try {
      const expectedAmountResponse = await controllerCalculateBetAmounts({
        providerId,
        outcomeTokenId: outcomeToken.id,
        userBetAmount,
      });
      setBetAmounts(expectedAmountResponse);
    } catch (err) {
      console.error('Failed to calculate to win amount:', err);
      setError(err as string);
    } finally {
      setIsCalculating(false);
    }
  }, [outcomeToken, userBetAmount, controllerCalculateBetAmounts, providerId]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      calculateBetAmounts();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [calculateBetAmounts]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefreshTimeout) {
      return;
    }

    const refreshTimer = setInterval(() => {
      calculateBetAmounts();
    }, autoRefreshTimeout);

    return () => {
      clearInterval(refreshTimer);
    };
  }, [calculateBetAmounts, autoRefreshTimeout]);

  return {
    betAmounts,
    isCalculating,
    error,
  };
};
