import { BigNumber } from 'bignumber.js';
import { useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  useIsTransactionPayLoading,
  useIsTransactionPayQuoteLoading,
  useTransactionPayQuotes,
} from '../../../../../Views/confirmations/hooks/pay/useTransactionPayData';
import { useTransactionPayAvailableTokens } from '../../../../../Views/confirmations/hooks/pay/useTransactionPayAvailableTokens';
import {
  MINIMUM_BET,
  PAYMENT_SELECTOR_NAVIGATION_SAFETY_UNLOCK_MS,
  PAYMENT_SELECTOR_NAVIGATION_UNLOCK_DELAY_MS,
} from '../../../constants/transactions';
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
  hasBlockingPayAlerts: boolean;
}

export const usePredictBuyConditions = ({
  preview,
  currentValue,
  isPreviewCalculating,
  isUserInputChange,
  isConfirming,
  totalPayForPredictBalance,
  hasBlockingPayAlerts,
}: UsePredictBuyConditionsParams) => {
  const navigation = useNavigation();
  const { isBalanceLoading, availableBalance } =
    usePredictBuyAvailableBalance();
  const isPayTotalsLoading = useIsTransactionPayLoading();
  const isPayQuoteLoading = useIsTransactionPayQuoteLoading();
  const quotes = useTransactionPayQuotes();
  const { isDepositPending } = usePredictDeposit();
  const { isPredictBalanceSelected, selectedPaymentToken } =
    usePredictPaymentToken();
  const { data: predictBalance = 0 } = usePredictBalance();
  const { availableTokens } = useTransactionPayAvailableTokens();

  const shouldWaitForPayFees = !isPredictBalanceSelected && currentValue > 0;

  // Becomes true once the controller's quote loading cycle (`isPayQuoteLoading`)
  // has been observed as active for the current settling cycle. We use the raw
  // controller flag (not the combined `isPayFeesLoading` which also includes
  // `isTransactionDataUpdating`) so that transaction-data update cycles don't
  // falsely mark a loading cycle as "seen" — which would cause a premature
  // settling exit (Bug 3).
  const hasSeenLoadingRef = useRef(false);
  const [
    isPaymentSelectorNavigationLocked,
    setIsPaymentSelectorNavigationLocked,
  ] = useState(false);
  const isPaymentSelectorNavigationLockedRef = useRef(false);
  const didBlurAfterPaymentSelectorOpenRef = useRef(false);
  const paymentSelectorUnlockTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  const clearPaymentSelectorUnlockTimer = useCallback(() => {
    if (paymentSelectorUnlockTimerRef.current) {
      clearTimeout(paymentSelectorUnlockTimerRef.current);
      paymentSelectorUnlockTimerRef.current = null;
    }
  }, []);

  const updatePaymentSelectorNavigationLock = useCallback(
    (isLocked: boolean) => {
      isPaymentSelectorNavigationLockedRef.current = isLocked;
      setIsPaymentSelectorNavigationLocked(isLocked);
    },
    [],
  );

  const unlockPaymentSelectorNavigation = useCallback(() => {
    clearPaymentSelectorUnlockTimer();
    didBlurAfterPaymentSelectorOpenRef.current = false;
    updatePaymentSelectorNavigationLock(false);
  }, [clearPaymentSelectorUnlockTimer, updatePaymentSelectorNavigationLock]);

  const lockPaymentSelectorNavigation = useCallback(() => {
    clearPaymentSelectorUnlockTimer();
    didBlurAfterPaymentSelectorOpenRef.current = false;
    updatePaymentSelectorNavigationLock(true);
    paymentSelectorUnlockTimerRef.current = setTimeout(
      unlockPaymentSelectorNavigation,
      PAYMENT_SELECTOR_NAVIGATION_SAFETY_UNLOCK_MS,
    );
  }, [
    clearPaymentSelectorUnlockTimer,
    unlockPaymentSelectorNavigation,
    updatePaymentSelectorNavigationLock,
  ]);

  useEffect(() => {
    const scheduleUnlock = () => {
      clearPaymentSelectorUnlockTimer();
      paymentSelectorUnlockTimerRef.current = setTimeout(() => {
        unlockPaymentSelectorNavigation();
      }, PAYMENT_SELECTOR_NAVIGATION_UNLOCK_DELAY_MS);
    };

    const unsubscribeBlur = navigation.addListener('blur', () => {
      if (isPaymentSelectorNavigationLockedRef.current) {
        didBlurAfterPaymentSelectorOpenRef.current = true;
      }
    });

    const unsubscribeFocus = navigation.addListener('focus', () => {
      if (
        isPaymentSelectorNavigationLockedRef.current &&
        didBlurAfterPaymentSelectorOpenRef.current
      ) {
        scheduleUnlock();
      }
    });

    return () => {
      unsubscribeBlur();
      unsubscribeFocus();
      clearPaymentSelectorUnlockTimer();
    };
  }, [
    clearPaymentSelectorUnlockTimer,
    navigation,
    unlockPaymentSelectorNavigation,
  ]);

  const selectedPaymentTokenKey = useMemo(() => {
    if (!selectedPaymentToken?.address || !selectedPaymentToken?.chainId) {
      return null;
    }

    return `${selectedPaymentToken.chainId.toLowerCase()}:${selectedPaymentToken.address.toLowerCase()}`;
  }, [selectedPaymentToken?.address, selectedPaymentToken?.chainId]);

  const selectedPaymentSettlingKey = useMemo(() => {
    if (!selectedPaymentTokenKey) {
      return null;
    }

    return `${selectedPaymentTokenKey}:${totalPayForPredictBalance}`;
  }, [selectedPaymentTokenKey, totalPayForPredictBalance]);

  // Tracks the token/amount pair for which a full quote-loading cycle has
  // completed. Keeping the amount in the key makes same-token amount changes
  // settle again, while preserving same-token same-amount quotes across a brief
  // Predict-balance selection.
  const [lastSettledPaymentKey, setLastSettledPaymentKey] = useState<
    string | null
  >(null);

  // Synchronous derivation: true from the very first render after the selected
  // token or amount changes. No effects needed to flip a boolean flag, so there
  // is no one-frame window where the CTA flashes incorrectly (Bug 1 fixed).
  const isPaySystemSettling =
    !isPredictBalanceSelected &&
    selectedPaymentSettlingKey !== null &&
    selectedPaymentSettlingKey !== lastSettledPaymentKey;

  const isBalancePulsing = useMemo(
    () => isDepositPending && isPredictBalanceSelected,
    [isDepositPending, isPredictBalanceSelected],
  );

  const isBelowMinimum = useMemo(
    () => currentValue > 0 && currentValue < MINIMUM_BET,
    [currentValue],
  );

  const isInsufficientBalance = useMemo(
    () =>
      isPredictBalanceSelected &&
      !isConfirming &&
      totalPayForPredictBalance > 0 &&
      availableBalance < totalPayForPredictBalance,
    [
      availableBalance,
      isConfirming,
      isPredictBalanceSelected,
      totalPayForPredictBalance,
    ],
  );

  const isRateLimited = useMemo(() => preview?.rateLimited ?? false, [preview]);

  // Active loading: quotes are being fetched for the current ERC20 token.
  const isPayFeesLoading = useMemo(
    () => shouldWaitForPayFees && (isPayTotalsLoading || isPayQuoteLoading),
    [shouldWaitForPayFees, isPayTotalsLoading, isPayQuoteLoading],
  );

  // Effect 1 — track when the controller starts a real quote-loading cycle.
  // Uses `isPayQuoteLoading` (raw controller flag) rather than `isPayFeesLoading`
  // so that `isTransactionDataUpdating` cycles (from `updateTokenAmount`) do not
  // falsely set hasSeenLoadingRef. That false-positive caused a premature
  // settling exit when isTransactionDataUpdating briefly cycled true→false
  // BEFORE the controller started loading, resulting in the CTA flash (Bug 3).
  useEffect(() => {
    if (isPaySystemSettling && isPayQuoteLoading) {
      hasSeenLoadingRef.current = true;
    }
  }, [isPaySystemSettling, isPayQuoteLoading]);

  // Effect 2 — mark the current token as settled. Two exit paths:
  //
  // Path A (early, quotes present): controller finished AND quotes already
  // arrived in Redux. Exit immediately without waiting for isTransactionDataUpdating
  // to clear. At this point isPayFeesLoading is still true (isTransactionDataUpdating
  // still active), so isCurrentTokenInsufficient stays blocked even though
  // isPaySystemSettling just went false — no flash (Bug 4 fixed).
  //
  // Path B (late, no quotes): wait for the full isPayFeesLoading cycle (including
  // isTransactionDataUpdating) to complete. Covers real "no-liquidity" cases where
  // quotes never arrive — settling eventually exits and "Change Payment Method"
  // correctly appears.
  //
  // Requiring hasSeenLoadingRef prevents exiting during the pre-loading gap
  // (the window where isPayFeesLoading is momentarily false before the controller
  // dispatches isLoading = true, and when currentValue = 0 at token-selection time
  // so no loading cycle starts until the user types an amount — Bug 2 fixed).
  useEffect(() => {
    if (
      !isPaySystemSettling ||
      !hasSeenLoadingRef.current ||
      isPayQuoteLoading
    ) {
      return;
    }
    const quotesPresent = (quotes?.length ?? 0) > 0;
    if (quotesPresent || !isPayFeesLoading) {
      hasSeenLoadingRef.current = false;
      setLastSettledPaymentKey(selectedPaymentSettlingKey);
    }
  }, [
    isPaySystemSettling,
    isPayQuoteLoading,
    isPayFeesLoading,
    quotes,
    selectedPaymentSettlingKey,
  ]);

  // Effect 3 — stop any in-flight settling observation when switching back to
  // Predict balance. Keep the settled payment key so selecting the same token
  // for the same amount can reuse the existing quote state immediately.
  useEffect(() => {
    if (isPredictBalanceSelected) {
      hasSeenLoadingRef.current = false;
    }
  }, [isPredictBalanceSelected]);

  // Only surface token-insufficiency once the pay system has fully settled,
  // the amount is above the minimum bet (a below-minimum amount should surface
  // the minimum-bet error, not a payment CTA), and the amount is non-zero.
  const isCurrentTokenInsufficient = useMemo(
    () =>
      currentValue > 0 &&
      !isBelowMinimum &&
      !isPaySystemSettling &&
      !isPayFeesLoading &&
      (isInsufficientBalance || hasBlockingPayAlerts),
    [
      currentValue,
      isBelowMinimum,
      isPaySystemSettling,
      isPayFeesLoading,
      isInsufficientBalance,
      hasBlockingPayAlerts,
    ],
  );

  const hasAlternativeBalance = useMemo(() => {
    if (totalPayForPredictBalance <= 0) return false;

    const hasAlternativeERC20 = availableTokens.some(
      (token) =>
        !token.isSelected &&
        !token.disabled &&
        new BigNumber(token.fiat?.balance ?? 0).gte(totalPayForPredictBalance),
    );

    if (isPredictBalanceSelected) {
      return hasAlternativeERC20;
    }

    return predictBalance >= totalPayForPredictBalance || hasAlternativeERC20;
  }, [
    availableTokens,
    isPredictBalanceSelected,
    predictBalance,
    totalPayForPredictBalance,
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
      !hasBlockingPayAlerts &&
      !isPaymentSelectorNavigationLocked,
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
      isPaymentSelectorNavigationLocked,
    ],
  );

  const isUserChangeTriggeringCalculation = useMemo(
    () => isPreviewCalculating && isUserInputChange,
    [isPreviewCalculating, isUserInputChange],
  );

  return {
    isBelowMinimum,
    isInsufficientBalance,
    isCurrentTokenInsufficient,
    hasAlternativeBalance,
    isRateLimited,
    canPlaceBet,
    isUserChangeTriggeringCalculation,
    isPayFeesLoading,
    isBalancePulsing,
    isPaySystemSettling,
    isPaymentSelectorNavigationLocked,
    lockPaymentSelectorNavigation,
  };
};
