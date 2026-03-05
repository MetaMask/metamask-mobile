import { useMemo } from 'react';
import { MINIMUM_BET } from '../constants/transactions';
import { OrderPreview } from '../types';
import { usePredictBuyAvailableBalance } from './usePredictBuyAvailableBalance';

interface UsePredictBuyConditionsParams {
  currentValue: number;
  preview?: OrderPreview | null;
  isPreviewCalculating: boolean;
  isPlaceOrderLoading: boolean;
  isPayWithAnyTokenProcessing: boolean;
  isUserInputChange: boolean;
}

export const usePredictBuyConditions = ({
  preview,
  currentValue,
  isPreviewCalculating,
  isPlaceOrderLoading,
  isPayWithAnyTokenProcessing,
  isUserInputChange,
}: UsePredictBuyConditionsParams) => {
  const { isBalanceLoading } = usePredictBuyAvailableBalance();

  const isBelowMinimum = useMemo(
    () => currentValue > 0 && currentValue < MINIMUM_BET,
    [currentValue],
  );

  const isRateLimited = useMemo(() => preview?.rateLimited ?? false, [preview]);

  const canPlaceBet = useMemo(
    () =>
      !isBelowMinimum &&
      !!preview &&
      !isPlaceOrderLoading &&
      !isRateLimited &&
      !isPreviewCalculating &&
      !isBalanceLoading,
    [
      isBelowMinimum,
      preview,
      isPlaceOrderLoading,
      isRateLimited,
      isPreviewCalculating,
      isBalanceLoading,
    ],
  );

  const isPlacingOrder = useMemo(
    () => isPlaceOrderLoading || !!isPayWithAnyTokenProcessing,
    [isPlaceOrderLoading, isPayWithAnyTokenProcessing],
  );

  const isUserChangeTriggeringCalculation = useMemo(
    () => isPreviewCalculating && isUserInputChange,
    [isPreviewCalculating, isUserInputChange],
  );

  return {
    isBelowMinimum,
    isRateLimited,
    isPlacingOrder,
    canPlaceBet,
    isUserChangeTriggeringCalculation,
  };
};
