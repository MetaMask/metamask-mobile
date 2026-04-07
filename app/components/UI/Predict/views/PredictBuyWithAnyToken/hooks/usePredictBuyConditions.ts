import { useEffect, useMemo } from 'react';
import { useInsufficientPayTokenBalanceAlert } from '../../../../../Views/confirmations/hooks/alerts/useInsufficientPayTokenBalanceAlert';
import {
  useIsTransactionPayLoading,
  useIsTransactionPayQuoteLoading,
  useTransactionPayQuotes,
  useTransactionPayTotals,
} from '../../../../../Views/confirmations/hooks/pay/useTransactionPayData';
import { MINIMUM_BET } from '../../../constants/transactions';
import { usePredictBalance } from '../../../hooks/usePredictBalance';
import { usePredictDeposit } from '../../../hooks/usePredictDeposit';
import { usePredictPaymentToken } from '../../../hooks/usePredictPaymentToken';
import { OrderPreview } from '../../../types';
import { usePredictBuyAvailableBalance } from './usePredictBuyAvailableBalance';

interface UsePredictBuyConditionsParams {
  currentValue: number;
  preview?: OrderPreview | null;
  isPreviewCalculating: boolean;
  isUserInputChange: boolean;
  isConfirming: boolean;
  totalPayForPredictBalance: number;
  isInputFocused: boolean;
}

export const usePredictBuyConditions = ({
  preview,
  currentValue,
  isPreviewCalculating,
  isUserInputChange,
  isConfirming,
  totalPayForPredictBalance,
  isInputFocused,
}: UsePredictBuyConditionsParams) => {
  const { isBalanceLoading, availableBalance } =
    usePredictBuyAvailableBalance();
  const isPayTotalsLoading = useIsTransactionPayLoading();
  const isPayQuoteLoading = useIsTransactionPayQuoteLoading();
  const { isDepositPending } = usePredictDeposit();
  const payTotals = useTransactionPayTotals();
  const quotes = useTransactionPayQuotes();
  const { isPredictBalanceSelected, resetSelectedPaymentToken } =
    usePredictPaymentToken();
  const { data: predictBalance = 0 } = usePredictBalance();

  const [insufficientPayTokenBalanceAlert] =
    useInsufficientPayTokenBalanceAlert();

  const shouldWaitForPayFees = !isPredictBalanceSelected;

  const isBalancePulsing = useMemo(
    () => isDepositPending && isPredictBalanceSelected,
    [isDepositPending, isPredictBalanceSelected],
  );

  const isBelowMinimum = useMemo(
    () => currentValue > 0 && currentValue < MINIMUM_BET,
    [currentValue],
  );

  const maxBetAmount = useMemo(() => {
    const feeRate = (preview?.fees?.totalFeePercentage ?? 0) / 100;
    return Math.max(
      0,
      Math.floor((availableBalance / (1 + feeRate)) * 100) / 100,
    );
  }, [availableBalance, preview?.fees?.totalFeePercentage]);

  const isInsufficientBalance = useMemo(
    () =>
      isPredictBalanceSelected &&
      !isConfirming &&
      currentValue > 0 &&
      currentValue > maxBetAmount,
    [isConfirming, isPredictBalanceSelected, currentValue, maxBetAmount],
  );

  const isInsufficientPayTokenBalance = useMemo(
    () => !isPredictBalanceSelected && !!insufficientPayTokenBalanceAlert,
    [isPredictBalanceSelected, insufficientPayTokenBalanceAlert],
  );

  const isRateLimited = useMemo(() => preview?.rateLimited ?? false, [preview]);

  const isPayFeesLoading = useMemo(
    () =>
      shouldWaitForPayFees &&
      (isPayTotalsLoading ||
        isPayQuoteLoading ||
        (quotes?.length === 0 && !payTotals)),
    [
      shouldWaitForPayFees,
      isPayTotalsLoading,
      isPayQuoteLoading,
      payTotals,
      quotes?.length,
    ],
  );

  const canPlaceBet = useMemo(
    () =>
      !isConfirming &&
      !isBelowMinimum &&
      !isInsufficientBalance &&
      !!preview &&
      !isRateLimited &&
      !isBalanceLoading &&
      !isPayFeesLoading &&
      !isInsufficientPayTokenBalance,
    [
      isConfirming,
      isBelowMinimum,
      isInsufficientBalance,
      preview,
      isRateLimited,
      isBalanceLoading,
      isPayFeesLoading,
      isInsufficientPayTokenBalance,
    ],
  );

  const isUserChangeTriggeringCalculation = useMemo(
    () => isPreviewCalculating && isUserInputChange,
    [isPreviewCalculating, isUserInputChange],
  );

  useEffect(() => {
    if (
      !isPredictBalanceSelected &&
      !isInputFocused &&
      totalPayForPredictBalance > 0 &&
      predictBalance >= totalPayForPredictBalance
    ) {
      resetSelectedPaymentToken();
    }
  }, [
    isInputFocused,
    isPredictBalanceSelected,
    predictBalance,
    resetSelectedPaymentToken,
    totalPayForPredictBalance,
  ]);

  return {
    isBelowMinimum,
    isInsufficientBalance,
    maxBetAmount,
    isRateLimited,
    canPlaceBet,
    isUserChangeTriggeringCalculation,
    isPayFeesLoading,
    isBalancePulsing,
  };
};
