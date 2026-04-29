import { BigNumber } from 'bignumber.js';
import { useEffect, useMemo } from 'react';
import {
  useIsTransactionPayLoading,
  useIsTransactionPayQuoteLoading,
  useTransactionPayQuotes,
} from '../../../../../Views/confirmations/hooks/pay/useTransactionPayData';
import { useTransactionPayAvailableTokens } from '../../../../../Views/confirmations/hooks/pay/useTransactionPayAvailableTokens';
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
  hasBlockingPayAlerts: boolean;
}

export const usePredictBuyConditions = ({
  preview,
  currentValue,
  isPreviewCalculating,
  isUserInputChange,
  isConfirming,
  totalPayForPredictBalance,
  isInputFocused,
  hasBlockingPayAlerts,
}: UsePredictBuyConditionsParams) => {
  const { isBalanceLoading, availableBalance } =
    usePredictBuyAvailableBalance();
  const isPayTotalsLoading = useIsTransactionPayLoading();
  const isPayQuoteLoading = useIsTransactionPayQuoteLoading();
  // quotes === undefined means the controller hasn't yet completed a quote
  // cycle for this transaction; quotes === [] means a cycle ran but found no
  // routes; quotes === [...] means valid routes exist.
  const quotes = useTransactionPayQuotes();
  const { isDepositPending } = usePredictDeposit();
  const { isPredictBalanceSelected, resetSelectedPaymentToken } =
    usePredictPaymentToken();
  const { data: predictBalance = 0 } = usePredictBalance();
  const { availableTokens } = useTransactionPayAvailableTokens();

  const shouldWaitForPayFees = !isPredictBalanceSelected && currentValue > 0;

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

  const isRateLimited = useMemo(() => preview?.rateLimited ?? false, [preview]);

  // Compute pay-fees loading state early so isCurrentTokenInsufficient can be
  // gated on it — blocking alerts during quote-fetch must not trigger the
  // "Change Payment Method" / "Add Funds" CTA prematurely.
  const isPayFeesLoading = useMemo(
    () => shouldWaitForPayFees && (isPayTotalsLoading || isPayQuoteLoading),
    [shouldWaitForPayFees, isPayTotalsLoading, isPayQuoteLoading],
  );

  // Whether the TransactionPay controller has completed at least one quote
  // cycle. `quotes` starts as `undefined` and becomes an array (empty or not)
  // only after the first fetch resolves. Using this as a secondary gate
  // prevents the "Change Payment Method" CTA from flashing during the brief
  // window between `updateSourceAmounts` (synchronous) and `updateQuotes`
  // setting `isLoading = true` (asynchronous), which is NOT covered by
  // `isPayFeesLoading` alone.
  const hasQuoteCycleCompleted = quotes !== undefined && quotes !== null;

  // Only surface token-insufficiency after the pay system has settled.
  // Two guards:
  //  1. isPayFeesLoading — covers the active quote-fetch period
  //  2. hasQuoteCycleCompleted — covers the gap before the first fetch starts
  //     (sourceAmounts updated synchronously, isLoading not yet true)
  const isCurrentTokenInsufficient = useMemo(
    () =>
      !isPayFeesLoading &&
      (!isPredictBalanceSelected ? hasQuoteCycleCompleted : true) &&
      (isInsufficientBalance || hasBlockingPayAlerts),
    [
      isPayFeesLoading,
      isPredictBalanceSelected,
      hasQuoteCycleCompleted,
      isInsufficientBalance,
      hasBlockingPayAlerts,
    ],
  );

  const hasAlternativeBalance = useMemo(() => {
    if (currentValue <= 0) return false;

    const hasAlternativeERC20 = availableTokens.some(
      (token) =>
        !token.isSelected &&
        !token.disabled &&
        new BigNumber(token.fiat?.balance ?? 0).gte(currentValue),
    );

    if (isPredictBalanceSelected) {
      return hasAlternativeERC20;
    }

    // Apply the same fee adjustment to predictBalance that maxBetAmount uses for
    // the selected ERC20, so we only suggest Predict balance as an alternative
    // when it can actually cover the bet after fees.
    const feeRate = (preview?.fees?.totalFeePercentage ?? 0) / 100;
    const predictMaxBetAmount = Math.max(
      0,
      Math.floor((predictBalance / (1 + feeRate)) * 100) / 100,
    );
    return predictMaxBetAmount >= currentValue || hasAlternativeERC20;
  }, [
    availableTokens,
    currentValue,
    isPredictBalanceSelected,
    predictBalance,
    preview?.fees?.totalFeePercentage,
  ]);

  const canPlaceBet = useMemo(
    () =>
      !isConfirming &&
      !isBelowMinimum &&
      !isInsufficientBalance &&
      !!preview &&
      !isRateLimited &&
      !isBalanceLoading &&
      !isPayFeesLoading &&
      !hasBlockingPayAlerts,
    [
      isConfirming,
      isBelowMinimum,
      isInsufficientBalance,
      preview,
      isRateLimited,
      isBalanceLoading,
      isPayFeesLoading,
      hasBlockingPayAlerts,
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
    isCurrentTokenInsufficient,
    hasAlternativeBalance,
    maxBetAmount,
    isRateLimited,
    canPlaceBet,
    isUserChangeTriggeringCalculation,
    isPayFeesLoading,
    isBalancePulsing,
  };
};
