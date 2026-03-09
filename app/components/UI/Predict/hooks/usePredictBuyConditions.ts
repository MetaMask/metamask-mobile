import { useMemo } from 'react';
import { MINIMUM_BET } from '../constants/transactions';
import { ActiveOrderState, OrderPreview } from '../types';
import { usePredictBuyAvailableBalance } from './usePredictBuyAvailableBalance';
import { usePredictActiveOrder } from './usePredictActiveOrder';
import { useIsTransactionPayLoading } from '../../../Views/confirmations/hooks/pay/useTransactionPayData';
import { usePredictPaymentToken } from './usePredictPaymentToken';

interface UsePredictBuyConditionsParams {
  currentValue: number;
  preview?: OrderPreview | null;
  isPreviewCalculating: boolean;
  isPlaceOrderLoading: boolean;
  isUserInputChange: boolean;
}

export const usePredictBuyConditions = ({
  preview,
  currentValue,
  isPreviewCalculating,
  isPlaceOrderLoading,
  isUserInputChange,
}: UsePredictBuyConditionsParams) => {
  const { isBalanceLoading } = usePredictBuyAvailableBalance();
  const { activeOrder } = usePredictActiveOrder();
  const isPayTotalsLoading = useIsTransactionPayLoading();
  const { isPredictBalanceSelected } = usePredictPaymentToken();

  const shouldWaitForPayFees = !isPredictBalanceSelected;

  const isBelowMinimum = useMemo(
    () => currentValue > 0 && currentValue < MINIMUM_BET,
    [currentValue],
  );

  const isRateLimited = useMemo(() => preview?.rateLimited ?? false, [preview]);

  const isDepositing = useMemo(
    () => activeOrder?.state === ActiveOrderState.DEPOSITING,
    [activeOrder],
  );

  const isPlacingOrder = useMemo(
    () =>
      activeOrder?.state === ActiveOrderState.PLACING_ORDER ||
      isPlaceOrderLoading ||
      isDepositing,
    [activeOrder?.state, isPlaceOrderLoading, isDepositing],
  );

  const isRedirecting = useMemo(
    () => activeOrder?.state === ActiveOrderState.REDIRECTING,
    [activeOrder],
  );

  const isPayFeesLoading = useMemo(
    () => isRedirecting || (shouldWaitForPayFees && isPayTotalsLoading),
    [isRedirecting, shouldWaitForPayFees, isPayTotalsLoading],
  );

  const canPlaceBet = useMemo(
    () =>
      !isBelowMinimum &&
      !!preview &&
      !isPlaceOrderLoading &&
      !isRateLimited &&
      !isBalanceLoading &&
      !isRedirecting &&
      !isPayFeesLoading,
    [
      isBelowMinimum,
      preview,
      isPlaceOrderLoading,
      isRateLimited,
      isBalanceLoading,
      isRedirecting,
      isPayFeesLoading,
    ],
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
    isPayFeesLoading,
  };
};
