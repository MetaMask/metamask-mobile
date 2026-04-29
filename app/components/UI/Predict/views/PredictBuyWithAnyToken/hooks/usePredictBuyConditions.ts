import { BigNumber } from 'bignumber.js';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  useIsTransactionPayLoading,
  useIsTransactionPayQuoteLoading,
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
  const { isDepositPending } = usePredictDeposit();
  const {
    isPredictBalanceSelected,
    selectedPaymentToken,
    resetSelectedPaymentToken,
  } = usePredictPaymentToken();
  const { data: predictBalance = 0 } = usePredictBalance();
  const { availableTokens } = useTransactionPayAvailableTokens();

  const shouldWaitForPayFees = !isPredictBalanceSelected && currentValue > 0;

  // Tracks the token address we last entered a settling cycle for, so we only
  // reset `isPaySystemSettling` when the actual token identity changes.
  const settlingTokenRef = useRef<string | null>(null);
  // Becomes true once `isPayFeesLoading` has been observed as true for the
  // current settling cycle, ensuring we only exit settling after loading has
  // both started AND completed — not during the brief pre-loading gap.
  const hasSeenLoadingRef = useRef(false);
  const [isPaySystemSettling, setIsPaySystemSettling] = useState(false);

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

  // Active loading: quotes are being fetched for the current ERC20 token.
  const isPayFeesLoading = useMemo(
    () => shouldWaitForPayFees && (isPayTotalsLoading || isPayQuoteLoading),
    [shouldWaitForPayFees, isPayTotalsLoading, isPayQuoteLoading],
  );

  // Enter settling whenever the selected ERC20 token identity changes.
  // This covers the gap between the synchronous payToken update and the
  // asynchronous isLoading = true dispatch — a window where stale quotes from
  // the previous token would otherwise cause premature CTA state changes.
  useEffect(() => {
    if (!isPredictBalanceSelected && selectedPaymentToken) {
      const key = selectedPaymentToken.address;
      if (settlingTokenRef.current !== key) {
        settlingTokenRef.current = key;
        hasSeenLoadingRef.current = false;
        setIsPaySystemSettling(true);
      }
    } else {
      settlingTokenRef.current = null;
      hasSeenLoadingRef.current = false;
      setIsPaySystemSettling(false);
    }
  }, [isPredictBalanceSelected, selectedPaymentToken]);

  // Mark that loading has become active for the current settling cycle.
  useEffect(() => {
    if (isPaySystemSettling && isPayFeesLoading) {
      hasSeenLoadingRef.current = true;
    }
  }, [isPaySystemSettling, isPayFeesLoading]);

  // Exit settling only after loading has started AND completed, or when quote
  // fetching is not expected (e.g. currentValue is 0, shouldWaitForPayFees
  // becomes false). This prevents exiting during the pre-loading gap where
  // isPayFeesLoading is momentarily false before the controller dispatches
  // isLoading = true.
  useEffect(() => {
    if (
      isPaySystemSettling &&
      !isPayFeesLoading &&
      (hasSeenLoadingRef.current || !shouldWaitForPayFees)
    ) {
      setIsPaySystemSettling(false);
    }
  }, [isPaySystemSettling, isPayFeesLoading, shouldWaitForPayFees]);

  // Only surface token-insufficiency once the pay system has fully settled:
  // both the active-loading guard and the cross-token settling guard must pass.
  const isCurrentTokenInsufficient = useMemo(
    () =>
      !isPaySystemSettling &&
      !isPayFeesLoading &&
      (isInsufficientBalance || hasBlockingPayAlerts),
    [
      isPaySystemSettling,
      isPayFeesLoading,
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
      !isPaySystemSettling &&
      !isConfirming &&
      !isBelowMinimum &&
      !isInsufficientBalance &&
      !!preview &&
      !isRateLimited &&
      !isBalanceLoading &&
      !isPayFeesLoading &&
      !hasBlockingPayAlerts,
    [
      isPaySystemSettling,
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
    isPaySystemSettling,
  };
};
